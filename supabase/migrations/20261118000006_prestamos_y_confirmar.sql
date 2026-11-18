-- Préstamos otorgados, confirmación de previstos desde la web y categorías que
-- no son gasto (un préstamo es plata que sale y vuelve, no un consumo).

alter table categorias add column cuenta_como_gasto boolean not null default true;

insert into categorias (nombre, tipo, cuenta_como_gasto) values ('Préstamo otorgado', 'egreso', false);

-- El previsto de devolución apunta al movimiento del préstamo: así se calcula
-- la ganancia y, si se elimina el préstamo por error, su devolución se va con él.
alter table previstos add column origen_movimiento_id bigint references movimientos (id) on delete cascade;
create index previstos_origen_idx on previstos (origen_movimiento_id);

-- Columnas nuevas al final: create or replace solo permite agregar, no reordenar.
create or replace view previstos_con_pago with (security_invoker = true) as
select
  p.id,
  p.fijo_id,
  p.nombre,
  p.tipo,
  p.categoria_id,
  c.nombre_completo as categoria_nombre,
  p.persona,
  p.fecha_esperada,
  p.numero_cuota,
  f.cuotas_total,
  p.estado,
  p.monto_esperado_centimos,
  coalesce(sum(m.monto_centimos), 0)::integer as pagado_centimos,
  o.monto_centimos as prestado_centimos
from previstos p
join categorias_con_nombre c on c.id = p.categoria_id
left join fijos f on f.id = p.fijo_id
left join movimientos m on m.previsto_id = p.id
left join movimientos o on o.id = p.origen_movimiento_id
group by p.id, c.nombre_completo, f.cuotas_total, o.monto_centimos;

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
  coalesce(c.cuenta_como_gasto, true) as cuenta_como_gasto
from movimientos m
left join categorias c on c.id = m.categoria_id
left join categorias p on p.id = c.padre_id
left join previstos pr on pr.id = m.previsto_id;

-- El total del mes que muestra la confirmación del atajo deja fuera lo que no
-- es gasto (los préstamos otorgados). El resto de la función no cambia.
create or replace function registrar_movimiento_manual(
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
  previsto_restante_centimos integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
  v_inicio_mes date := date_trunc('month', p_fecha)::date;
  v_total bigint;
  v_estado estado_previsto;
  v_restante integer;
begin
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

  insert into fuentes (movimiento_id, tipo, contenido)
  values (v_id, 'manual', p_texto);

  if p_previsto_id is not null then
    perform recalcular_previsto(p_previsto_id);

    select p.estado, greatest(p.monto_esperado_centimos - coalesce(sum(m.monto_centimos), 0), 0)::integer
    into v_estado, v_restante
    from previstos p
    left join movimientos m on m.previsto_id = p.id
    where p.id = p_previsto_id
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

  return query select v_id, v_total, v_estado, v_restante;
end;
$$;

-- Prestar: sale la plata hoy (movimiento) y queda un cobro esperado con la
-- devolución acordada (previsto único). Ambos en una transacción.
create function registrar_prestamo(
  p_texto text,
  p_persona text,
  p_monto_centimos integer,
  p_devolucion_centimos integer,
  p_fecha date,
  p_fecha_devolucion date,
  p_patrones text[]
)
returns table (id_movimiento bigint, id_previsto bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_categoria_salida bigint;
  v_categoria_devolucion bigint;
  v_movimiento bigint;
  v_previsto bigint;
begin
  if p_monto_centimos <= 0 or p_devolucion_centimos <= 0 then
    raise exception 'Los montos deben ser mayores a cero';
  end if;
  if p_fecha_devolucion < p_fecha then
    raise exception 'La devolución no puede ser antes del préstamo';
  end if;

  select id into v_categoria_salida
  from categorias where nombre = 'Préstamo otorgado' and tipo = 'egreso' and padre_id is null;
  select id into v_categoria_devolucion
  from categorias where nombre = 'Préstamos' and tipo = 'ingreso' and padre_id is null;
  if v_categoria_salida is null or v_categoria_devolucion is null then
    raise exception 'Faltan las categorías de préstamos';
  end if;

  insert into movimientos (
    tipo, monto_centimos, moneda, fecha, descripcion, persona,
    categoria_id, origen_categoria, por_revisar, cuenta_id
  )
  values (
    'egreso', p_monto_centimos, 'PEN', p_fecha, 'Préstamo a ' || p_persona, p_persona,
    v_categoria_salida, 'manual', false,
    (select id from cuentas where predeterminada)
  )
  returning id into v_movimiento;

  insert into fuentes (movimiento_id, tipo, contenido)
  values (v_movimiento, 'manual', p_texto);

  insert into previstos (
    nombre, tipo, categoria_id, persona, patrones,
    monto_esperado_centimos, fecha_esperada, origen_movimiento_id
  )
  values (
    'Préstamo', 'ingreso', v_categoria_devolucion, p_persona, p_patrones,
    p_devolucion_centimos, p_fecha_devolucion, v_movimiento
  )
  returning id into v_previsto;

  return query select v_movimiento, v_previsto;
end;
$$;

-- "Ya pagué Prime" con un toque: crea el movimiento asociado al previsto con
-- el monto indicado (por defecto, lo que falta) y recalcula su estado.
create function confirmar_previsto(p_previsto_id bigint, p_monto_centimos integer, p_fecha date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previsto previstos%rowtype;
  v_movimiento bigint;
begin
  select * into v_previsto from previstos where id = p_previsto_id for update;
  if not found then
    raise exception 'El previsto no existe';
  end if;
  if v_previsto.estado not in ('pendiente', 'parcial') then
    raise exception 'Este previsto ya está resuelto';
  end if;
  if p_monto_centimos is null or p_monto_centimos <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  insert into movimientos (
    tipo, monto_centimos, moneda, fecha, descripcion, persona,
    categoria_id, origen_categoria, por_revisar, cuenta_id, previsto_id
  )
  values (
    v_previsto.tipo, p_monto_centimos, 'PEN', p_fecha,
    v_previsto.nombre || coalesce(' · ' || v_previsto.persona, ''), v_previsto.persona,
    v_previsto.categoria_id, 'fijo', false,
    (select id from cuentas where predeterminada),
    p_previsto_id
  )
  returning id into v_movimiento;

  insert into fuentes (movimiento_id, tipo, contenido)
  values (v_movimiento, 'manual', 'confirmado desde la web');

  perform recalcular_previsto(p_previsto_id);
end;
$$;

revoke execute on function registrar_movimiento_manual from public, anon, authenticated;
revoke execute on function registrar_prestamo from public, anon, authenticated;
revoke execute on function confirmar_previsto from public, anon, authenticated;
