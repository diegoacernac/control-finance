-- Categorías y reglas genéricas que faltaban para los fijos.
insert into categorias (nombre, tipo) values
  ('Junta', 'ingreso'),
  ('Junta', 'egreso'),
  ('Ocio', 'egreso');

insert into reglas (patron, categoria_id)
select r.patron, c.id
from (values
  ('ingreso', 'Junta', 'junta'),
  ('egreso', 'Junta', 'junta'),
  ('egreso', 'Ocio', 'cine'),
  ('egreso', 'Ocio', 'cinemark'),
  ('egreso', 'Préstamos', 'ripley'),
  ('egreso', 'Plataformas', 'apple music'),
  ('egreso', 'Plataformas', 'rappi pro'),
  ('egreso', 'Plataformas', 'uber one'),
  ('egreso', 'Plataformas', 'uber plus')
) as r (tipo, categoria, patron)
join categorias c
  on c.nombre = r.categoria
  and c.tipo = r.tipo::tipo_movimiento
  and c.padre_id is null;

create view categorias_con_nombre with (security_invoker = true) as
select
  c.id,
  c.tipo,
  case when p.id is null then c.nombre else p.nombre || ' › ' || c.nombre end as nombre_completo
from categorias c
left join categorias p on p.id = c.padre_id;

-- Cuentas ---------------------------------------------------------------

-- El saldo se ancla a un valor conocido (el que ves en el banco) en un momento
-- dado; desde ahí suman o restan los movimientos posteriores.
create table cuentas (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  predeterminada boolean not null default false,
  saldo_base_centimos integer not null default 0,
  saldo_base_en timestamptz not null default now()
);

create unique index cuentas_una_predeterminada_idx on cuentas (predeterminada) where predeterminada;

alter table movimientos add column cuenta_id bigint references cuentas (id);

-- Un movimiento cuenta para el saldo si su fecha es posterior al día del saldo
-- base, o si es del mismo día y se registró después. Los de días anteriores ya
-- estaban reflejados en el saldo que viste en el banco. Solo soles.
create view saldos_cuentas with (security_invoker = true) as
select
  c.id,
  c.nombre,
  c.saldo_base_centimos + coalesce(sum(
    case when m.tipo = 'ingreso' then m.monto_centimos else -m.monto_centimos end
  ), 0) as saldo_centimos
from cuentas c
left join movimientos m
  on m.cuenta_id = c.id
  and m.moneda = 'PEN'
  and (
    m.fecha > (c.saldo_base_en at time zone 'America/Lima')::date
    or (m.fecha = (c.saldo_base_en at time zone 'America/Lima')::date and m.creado_en > c.saldo_base_en)
  )
group by c.id;

-- Fijos y previstos -------------------------------------------------------

create type estado_previsto as enum ('pendiente', 'parcial', 'confirmado', 'omitido');

-- Plantilla de un ingreso o egreso que se repite. patrones: palabras que lo
-- reconocen en el texto; persona, si existe, también debe aparecer.
create table fijos (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo tipo_movimiento not null,
  categoria_id bigint not null references categorias (id),
  monto_centimos integer not null check (monto_centimos > 0),
  dias_pago smallint[] not null check (cardinality(dias_pago) > 0 and 1 <= all (dias_pago) and 31 >= all (dias_pago)),
  persona text,
  patrones text[] not null check (cardinality(patrones) > 0),
  cuotas_total smallint check (cuotas_total > 0),
  cuotas_previas smallint not null default 0 check (cuotas_previas >= 0),
  vigente_desde date not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Cada aparición esperada de un fijo, o un ingreso/egreso único (fijo_id null).
-- Copia nombre, patrones y monto del fijo para que editar el fijo no reescriba
-- meses pasados. fecha_esperada null = sin fecha conocida.
create table previstos (
  id bigint generated always as identity primary key,
  fijo_id bigint references fijos (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo tipo_movimiento not null,
  categoria_id bigint not null references categorias (id),
  persona text,
  patrones text[] not null check (cardinality(patrones) > 0),
  monto_esperado_centimos integer not null check (monto_esperado_centimos > 0),
  fecha_esperada date,
  numero_cuota smallint,
  estado estado_previsto not null default 'pendiente',
  creado_en timestamptz not null default now(),
  unique (fijo_id, fecha_esperada)
);

create index previstos_abiertos_idx on previstos (tipo, fecha_esperada) where estado in ('pendiente', 'parcial');

alter table movimientos add column previsto_id bigint references previstos (id) on delete set null;
create index movimientos_previsto_idx on movimientos (previsto_id);

alter table cuentas enable row level security;
alter table fijos enable row level security;
alter table previstos enable row level security;

create view previstos_abiertos with (security_invoker = true) as
select
  p.id,
  p.fijo_id,
  p.nombre,
  p.tipo,
  p.categoria_id,
  c.nombre_completo as categoria_nombre,
  p.persona,
  p.patrones,
  p.fecha_esperada
from previstos p
join categorias_con_nombre c on c.id = p.categoria_id
where p.estado in ('pendiente', 'parcial');

-- Genera los previstos de cada fijo activo desde su vigencia hasta el mes de
-- p_hasta. Es idempotente (unique fijo_id + fecha) y se llama en cada registro,
-- así no hace falta un cron. Los fijos en cuotas dejan de generar al llegar al
-- total; los previstos omitidos no cuentan como cuota.
create function asegurar_previstos(p_hasta date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_fijo fijos%rowtype;
  v_mes date;
  v_ultimo_dia_mes integer;
  v_dia smallint;
  v_fecha date;
  v_cuota integer;
begin
  for v_fijo in select * from fijos where activo order by id loop
    v_mes := date_trunc('month', v_fijo.vigente_desde)::date;

    while v_mes <= date_trunc('month', p_hasta)::date loop
      v_ultimo_dia_mes := extract(day from (v_mes + interval '1 month - 1 day'))::integer;

      for v_dia in select d from unnest(v_fijo.dias_pago) as d order by d loop
        -- Un pago del día 31 cae el último día en meses más cortos.
        v_fecha := v_mes + (least(v_dia, v_ultimo_dia_mes) - 1);
        continue when v_fecha < v_fijo.vigente_desde;
        continue when exists (select 1 from previstos where fijo_id = v_fijo.id and fecha_esperada = v_fecha);

        v_cuota := null;
        if v_fijo.cuotas_total is not null then
          select v_fijo.cuotas_previas + count(*) + 1 into v_cuota
          from previstos
          where fijo_id = v_fijo.id and estado <> 'omitido';
          exit when v_cuota > v_fijo.cuotas_total;
        end if;

        insert into previstos (
          fijo_id, nombre, tipo, categoria_id, persona, patrones,
          monto_esperado_centimos, fecha_esperada, numero_cuota
        )
        values (
          v_fijo.id, v_fijo.nombre, v_fijo.tipo, v_fijo.categoria_id, v_fijo.persona, v_fijo.patrones,
          v_fijo.monto_centimos, v_fecha, v_cuota
        );
      end loop;

      v_mes := (v_mes + interval '1 month')::date;
    end loop;
  end loop;
end;
$$;

-- Estado según lo cobrado/pagado: desde el 90% del monto esperado se da por
-- confirmado (tipo de cambio, ajustes de precio); por debajo es parcial (ej:
-- sueldo pagado en partes).
create function recalcular_previsto(p_previsto_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  c_porcentaje_confirmacion constant integer := 90;
  v_previsto previstos%rowtype;
  v_pagado integer;
  v_cantidad integer;
  v_estado estado_previsto;
begin
  select * into v_previsto from previstos where id = p_previsto_id for update;
  if v_previsto.estado = 'omitido' then
    return;
  end if;

  select coalesce(sum(monto_centimos), 0)::integer, count(*)::integer
  into v_pagado, v_cantidad
  from movimientos
  where previsto_id = p_previsto_id;

  v_estado := case
    when v_pagado = 0 then 'pendiente'
    when v_pagado::bigint * 100 >= v_previsto.monto_esperado_centimos::bigint * c_porcentaje_confirmacion then 'confirmado'
    else 'parcial'
  end;

  update previstos set estado = v_estado where id = p_previsto_id;

  -- Un solo cobro que confirma refleja el precio real actual (Disney que sube,
  -- Claude según el tipo de cambio): se usa como referencia hacia adelante.
  if v_estado = 'confirmado' and v_cantidad = 1 and v_previsto.fijo_id is not null then
    update fijos set monto_centimos = v_pagado where id = v_previsto.fijo_id;
    update previstos
    set monto_esperado_centimos = v_pagado
    where fijo_id = v_previsto.fijo_id
      and estado = 'pendiente'
      and fecha_esperada > v_previsto.fecha_esperada;
  end if;
end;
$$;

-- Registro --------------------------------------------------------------

drop function registrar_movimiento_manual(text, tipo_movimiento, integer, moneda, date, text, text, bigint);

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
  where m.tipo = p_tipo
    and m.moneda = p_moneda
    and m.fecha >= v_inicio_mes
    and m.fecha < (v_inicio_mes + interval '1 month')::date;

  return query select v_id, v_total, v_estado, v_restante;
end;
$$;

revoke execute on function asegurar_previstos from public, anon, authenticated;
revoke execute on function recalcular_previsto from public, anon, authenticated;
revoke execute on function registrar_movimiento_manual from public, anon, authenticated;
