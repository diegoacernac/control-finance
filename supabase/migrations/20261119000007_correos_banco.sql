-- Correos de Interbank (consumos con tarjeta y transferencias Plin/Yape) como
-- evidencia de movimientos. Un mismo gasto puede llegar por el atajo y por el
-- correo, en cualquier orden: estas funciones los unen en vez de duplicarlos.

-- Dos categorías raíz distintas (Taxi frente a Comida) indican que no es el
-- mismo gasto aunque el monto coincida. Si alguna falta, no hay conflicto.
create function categorias_en_conflicto(p_a bigint, p_b bigint)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select p_a is not null and p_b is not null
    and (select coalesce(padre_id, id) from categorias where id = p_a)
      <> (select coalesce(padre_id, id) from categorias where id = p_b);
$$;

-- Un correo del banco:
-- 1. Si ya se procesó (mismo id de Gmail), no hace nada.
-- 2. Si hay un movimiento del mismo tipo, moneda y monto, de fechas cercanas y
--    sin correo todavía, el correo se adjunta como evidencia (lo anotaste antes).
--    Si hay varios iguales (dos taxis de 10), da lo mismo a cuál: el total no cambia.
-- 3. Si no, crea el movimiento con la categoría y el previsto que eligió la app.
create function registrar_correo_banco(
  p_referencia text,
  p_contenido text,
  p_tipo tipo_movimiento,
  p_monto_centimos integer,
  p_moneda moneda,
  p_fecha date,
  p_ocurrido_en timestamptz,
  p_descripcion text,
  p_categoria_id bigint,
  p_origen_categoria origen_categoria,
  p_por_revisar boolean,
  p_previsto_id bigint
)
returns table (resultado text, id_movimiento bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- El correo puede llegar horas o un día después; el registro manual puede
  -- llevar la fecha de ayer.
  c_dias_de_tolerancia constant integer := 2;
  v_movimiento bigint;
begin
  select f.movimiento_id into v_movimiento
  from fuentes f
  where f.tipo = 'correo_banco' and f.referencia_externa = p_referencia;
  if found then
    return query select 'duplicado'::text, v_movimiento;
    return;
  end if;

  select m.id into v_movimiento
  from movimientos m
  where m.tipo = p_tipo
    and m.moneda = p_moneda
    and m.monto_centimos = p_monto_centimos
    and m.fecha between p_fecha - c_dias_de_tolerancia and p_fecha + c_dias_de_tolerancia
    and not exists (select 1 from fuentes f where f.movimiento_id = m.id and f.tipo = 'correo_banco')
    and not categorias_en_conflicto(m.categoria_id, p_categoria_id)
  order by abs(m.fecha - p_fecha), m.creado_en
  limit 1
  for update;

  if v_movimiento is not null then
    insert into fuentes (movimiento_id, tipo, contenido, referencia_externa)
    values (v_movimiento, 'correo_banco', p_contenido, p_referencia);

    update movimientos set ocurrido_en = coalesce(ocurrido_en, p_ocurrido_en) where id = v_movimiento;

    return query select 'unido'::text, v_movimiento;
    return;
  end if;

  insert into movimientos (
    tipo, monto_centimos, moneda, fecha, ocurrido_en, descripcion,
    categoria_id, origen_categoria, por_revisar, cuenta_id, previsto_id
  )
  values (
    p_tipo, p_monto_centimos, p_moneda, p_fecha, p_ocurrido_en, p_descripcion,
    p_categoria_id, p_origen_categoria, p_por_revisar,
    (select id from cuentas where predeterminada),
    p_previsto_id
  )
  returning id into v_movimiento;

  insert into fuentes (movimiento_id, tipo, contenido, referencia_externa)
  values (v_movimiento, 'correo_banco', p_contenido, p_referencia);

  if p_previsto_id is not null then
    perform recalcular_previsto(p_previsto_id);
  end if;

  return query select 'creado'::text, v_movimiento;
end;
$$;

-- El caso inverso: el correo llegó primero y luego lo dictas. En vez de crear
-- otro movimiento, se completa el del correo con tu descripción y, si la app la
-- reconoció, con tu categoría o previsto. Devuelve unido_con_correo para avisarte.
drop function registrar_movimiento_manual(text, tipo_movimiento, integer, moneda, date, text, text, bigint, origen_categoria, boolean, bigint);

create function registrar_movimiento_manual(
  p_texto text,
  p_tipo tipo_movimiento,
  p_monto_centimos integer,
  p_moneda moneda,
  p_fecha date,
  p_descripcion text,
  p_persona text,
  p_categoria_id bigint,
  p_origen_categoria origen_categoria,
  p_por_revisar boolean,
  p_previsto_id bigint
)
returns table (
  id_movimiento bigint,
  total_mes_centimos bigint,
  previsto_estado estado_previsto,
  previsto_restante_centimos integer,
  unido_con_correo boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  c_dias_de_tolerancia constant integer := 2;
  v_id bigint;
  v_del_correo movimientos%rowtype;
  v_previsto_final bigint := p_previsto_id;
  v_inicio_mes date := date_trunc('month', p_fecha)::date;
  v_total bigint;
  v_estado estado_previsto;
  v_restante integer;
begin
  select m.* into v_del_correo
  from movimientos m
  where m.tipo = p_tipo
    and m.moneda = p_moneda
    and m.monto_centimos = p_monto_centimos
    and m.fecha between p_fecha - c_dias_de_tolerancia and p_fecha + c_dias_de_tolerancia
    and exists (select 1 from fuentes f where f.movimiento_id = m.id and f.tipo = 'correo_banco')
    and not exists (select 1 from fuentes f where f.movimiento_id = m.id and f.tipo = 'manual')
    and not categorias_en_conflicto(m.categoria_id, p_categoria_id)
  order by abs(m.fecha - p_fecha), m.creado_en
  limit 1
  for update;

  if v_del_correo.id is not null then
    v_id := v_del_correo.id;
    update movimientos set descripcion = p_descripcion, persona = coalesce(p_persona, persona) where id = v_id;

    -- Lo que la app reconoció en tu texto manda; si no reconoció nada, queda lo
    -- que se dedujo del comercio. Un previsto ya asociado solo cambia por otro.
    if p_previsto_id is not null then
      update movimientos
      set categoria_id = p_categoria_id, origen_categoria = p_origen_categoria,
          por_revisar = p_por_revisar, previsto_id = p_previsto_id
      where id = v_id;
      if v_del_correo.previsto_id is not null and v_del_correo.previsto_id <> p_previsto_id then
        perform recalcular_previsto(v_del_correo.previsto_id);
      end if;
    elsif v_del_correo.previsto_id is null and p_categoria_id is not null then
      update movimientos
      set categoria_id = p_categoria_id, origen_categoria = p_origen_categoria, por_revisar = p_por_revisar
      where id = v_id;
    else
      v_previsto_final := v_del_correo.previsto_id;
    end if;
  else
    insert into movimientos (
      tipo, monto_centimos, moneda, fecha, descripcion, persona,
      categoria_id, origen_categoria, por_revisar, cuenta_id, previsto_id
    )
    values (
      p_tipo, p_monto_centimos, p_moneda, p_fecha, p_descripcion, p_persona,
      p_categoria_id, p_origen_categoria, p_por_revisar,
      (select id from cuentas where predeterminada),
      p_previsto_id
    )
    returning id into v_id;
  end if;

  insert into fuentes (movimiento_id, tipo, contenido)
  values (v_id, 'manual', p_texto);

  if v_previsto_final is not null then
    perform recalcular_previsto(v_previsto_final);

    select p.estado, greatest(p.monto_esperado_centimos - coalesce(sum(m.monto_centimos), 0), 0)::integer
    into v_estado, v_restante
    from previstos p
    left join movimientos m on m.previsto_id = p.id
    where p.id = v_previsto_final
    group by p.id;
  end if;

  select coalesce(sum(m.monto_centimos), 0)::bigint into v_total
  from movimientos m
  left join categorias c on c.id = m.categoria_id
  where m.tipo = p_tipo
    and m.moneda = p_moneda
    and m.fecha >= v_inicio_mes
    and m.fecha < (v_inicio_mes + interval '1 month')::date
    and coalesce(c.cuenta_como_gasto, true);

  return query select v_id, v_total, v_estado, v_restante, v_del_correo.id is not null;
end;
$$;

-- con_correo: el banco confirmó el movimiento (se muestra en la web).
create or replace view movimientos_con_categoria with (security_invoker = true) as
select
  m.id,
  m.tipo,
  m.monto_centimos,
  m.moneda,
  m.fecha,
  m.descripcion,
  m.persona,
  m.categoria_id,
  case when p.id is null then c.nombre else p.nombre || ' › ' || c.nombre end as categoria_nombre,
  coalesce(p.nombre, c.nombre) as categoria_raiz,
  m.por_revisar,
  m.previsto_id,
  pr.nombre as previsto_nombre,
  m.creado_en,
  coalesce(c.cuenta_como_gasto, true) as cuenta_como_gasto,
  exists (select 1 from fuentes f where f.movimiento_id = m.id and f.tipo = 'correo_banco') as con_correo
from movimientos m
left join categorias c on c.id = m.categoria_id
left join categorias p on p.id = c.padre_id
left join previstos pr on pr.id = m.previsto_id;

revoke execute on function categorias_en_conflicto from public, anon, authenticated;
revoke execute on function registrar_correo_banco from public, anon, authenticated;
revoke execute on function registrar_movimiento_manual from public, anon, authenticated;
