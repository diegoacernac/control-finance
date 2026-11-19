-- Planificación de los próximos meses: ahorro mensual, gastos o ingresos
-- planeados (viaje, laptop) y un gasto variable estimado (comida, taxis).

-- El ahorro sale de la cuenta hacia la alcancía de Interbank: resta del saldo
-- pero no es consumo, como un préstamo otorgado.
insert into categorias (nombre, tipo, cuenta_como_gasto) values ('Ahorro', 'egreso', false);

insert into reglas (patron, categoria_id)
select r.patron, c.id
from (values ('ahorro'), ('alcancia')) as r (patron)
join categorias c on c.nombre = 'Ahorro' and c.tipo = 'egreso' and c.padre_id is null;

-- Una sola fila: lo que esperas gastar al mes fuera de los fijos.
create table planificacion (
  id boolean primary key default true check (id),
  gasto_variable_centimos integer not null default 45000 check (gasto_variable_centimos >= 0)
);

insert into planificacion default values;

alter table planificacion enable row level security;

-- planeado: lo anotaste desde Planificar; se puede quitar mientras no tenga pagos.
alter table previstos add column planeado boolean not null default false;

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
  o.monto_centimos as prestado_centimos,
  p.planeado
from previstos p
join categorias_con_nombre c on c.id = p.categoria_id
left join fijos f on f.id = p.fijo_id
left join movimientos m on m.previsto_id = p.id
left join movimientos o on o.id = p.origen_movimiento_id
group by p.id, c.nombre_completo, f.cuotas_total, o.monto_centimos;

-- Un previsto único con fecha. Al registrar el gasto real se asocia por su
-- nombre completo ("viaje cusco 800"), como cualquier previsto.
create function planear_previsto(
  p_nombre text,
  p_tipo tipo_movimiento,
  p_categoria_id bigint,
  p_monto_centimos integer,
  p_fecha date,
  p_patrones text[]
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
begin
  if not exists (select 1 from categorias where id = p_categoria_id and tipo = p_tipo) then
    raise exception 'La categoría no corresponde al tipo';
  end if;
  if p_fecha < (now() at time zone 'America/Lima')::date then
    raise exception 'La fecha ya pasó';
  end if;

  insert into previstos (nombre, tipo, categoria_id, patrones, monto_esperado_centimos, fecha_esperada, planeado)
  values (p_nombre, p_tipo, p_categoria_id, p_patrones, p_monto_centimos, p_fecha, true)
  returning id into v_id;

  return v_id;
end;
$$;

create function quitar_previsto_planeado(p_previsto_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (select 1 from movimientos where previsto_id = p_previsto_id) then
    raise exception 'Ya tiene pagos asociados; omítelo en vez de quitarlo';
  end if;

  delete from previstos where id = p_previsto_id and planeado;
  if not found then
    raise exception 'Solo se pueden quitar los previstos planeados';
  end if;
end;
$$;

-- El ahorro mensual es un fijo como cualquier otro (se confirma cuando mueves
-- la plata a la alcancía). Cambiarlo rehace los previstos pendientes desde
-- hoy; monto 0 lo desactiva. Los omitidos y los ya pagados no se tocan.
create function configurar_ahorro(p_monto_centimos integer, p_dia smallint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_categoria bigint;
  v_fijo bigint;
begin
  if p_monto_centimos < 0 or p_dia not between 1 and 31 then
    raise exception 'Monto o día inválido';
  end if;

  select id into v_categoria from categorias where nombre = 'Ahorro' and tipo = 'egreso' and padre_id is null;
  select id into v_fijo from fijos where categoria_id = v_categoria order by id limit 1;

  if v_fijo is not null then
    delete from previstos p
    where p.fijo_id = v_fijo
      and p.estado = 'pendiente'
      and p.fecha_esperada >= v_hoy
      and not exists (select 1 from movimientos m where m.previsto_id = p.id);
  end if;

  if p_monto_centimos = 0 then
    update fijos set activo = false where id = v_fijo;
    return;
  end if;

  if v_fijo is null then
    insert into fijos (nombre, tipo, categoria_id, monto_centimos, dias_pago, patrones, vigente_desde)
    values ('Ahorro', 'egreso', v_categoria, p_monto_centimos, array[p_dia], array['ahorro', 'alcancia'], v_hoy);
  else
    update fijos
    set monto_centimos = p_monto_centimos, dias_pago = array[p_dia], activo = true, vigente_desde = v_hoy
    where id = v_fijo;
  end if;
end;
$$;

revoke execute on function planear_previsto from public, anon, authenticated;
revoke execute on function quitar_previsto_planeado from public, anon, authenticated;
revoke execute on function configurar_ahorro from public, anon, authenticated;
