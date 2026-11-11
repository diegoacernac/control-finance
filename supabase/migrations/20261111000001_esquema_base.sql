create type tipo_movimiento as enum ('ingreso', 'egreso');
create type moneda as enum ('PEN', 'USD');
create type origen_categoria as enum ('regla', 'manual', 'ia', 'fijo');
create type tipo_fuente as enum ('manual', 'correo_banco', 'correo_comercio', 'fijo');

create table categorias (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo tipo_movimiento not null,
  padre_id bigint references categorias (id),
  unique nulls not distinct (nombre, tipo, padre_id)
);

-- El patrón se compara sin tildes ni mayúsculas; la normalización la hace la app.
create table reglas (
  id bigint generated always as identity primary key,
  patron text not null check (length(trim(patron)) > 0),
  categoria_id bigint not null references categorias (id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (patron, categoria_id)
);

-- Un movimiento es la transacción real y lo único que suma en los totales.
-- Montos en céntimos para evitar errores de redondeo con decimales.
create table movimientos (
  id bigint generated always as identity primary key,
  tipo tipo_movimiento not null,
  monto_centimos integer not null check (monto_centimos > 0),
  moneda moneda not null default 'PEN',
  fecha date not null,
  ocurrido_en timestamptz,
  descripcion text not null,
  persona text,
  categoria_id bigint references categorias (id) on delete set null,
  origen_categoria origen_categoria,
  por_revisar boolean not null default false,
  creado_en timestamptz not null default now()
);

create index movimientos_fecha_idx on movimientos (fecha);

-- Cada evidencia de un movimiento (lo que escribiste, un correo del banco, un recibo).
-- referencia_externa (código de operación, id de Gmail) evita importar dos veces lo mismo.
create table fuentes (
  id bigint generated always as identity primary key,
  movimiento_id bigint not null references movimientos (id) on delete cascade,
  tipo tipo_fuente not null,
  contenido text not null,
  referencia_externa text,
  recibido_en timestamptz not null default now(),
  unique (tipo, referencia_externa)
);

create index fuentes_movimiento_idx on fuentes (movimiento_id);

-- Sin políticas: solo el servidor (clave secreta) puede leer o escribir.
-- Las políticas para la web con login se agregan cuando exista la web.
alter table categorias enable row level security;
alter table reglas enable row level security;
alter table movimientos enable row level security;
alter table fuentes enable row level security;

-- security_invoker para que la vista respete el RLS de las tablas.
create view reglas_con_categoria with (security_invoker = true) as
select
  r.patron,
  c.id as categoria_id,
  c.tipo as categoria_tipo,
  case when p.id is null then c.nombre else p.nombre || ' › ' || c.nombre end as categoria_nombre
from reglas r
join categorias c on c.id = r.categoria_id
left join categorias p on p.id = c.padre_id;

-- Inserta movimiento y fuente en una sola transacción y devuelve el total del mes
-- (mismo tipo y moneda) para mostrarlo en la confirmación del atajo.
create function registrar_movimiento_manual(
  p_texto text,
  p_tipo tipo_movimiento,
  p_monto_centimos integer,
  p_moneda moneda,
  p_fecha date,
  p_descripcion text,
  p_persona text,
  p_categoria_id bigint
)
returns table (id_movimiento bigint, total_mes_centimos bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
  v_inicio_mes date := date_trunc('month', p_fecha)::date;
begin
  insert into movimientos (
    tipo, monto_centimos, moneda, fecha, descripcion, persona,
    categoria_id, origen_categoria, por_revisar
  )
  values (
    p_tipo, p_monto_centimos, p_moneda, p_fecha, p_descripcion, p_persona,
    p_categoria_id,
    case when p_categoria_id is null then null else 'regla'::origen_categoria end,
    p_categoria_id is null
  )
  returning id into v_id;

  insert into fuentes (movimiento_id, tipo, contenido)
  values (v_id, 'manual', p_texto);

  return query
  select v_id, coalesce(sum(m.monto_centimos), 0)::bigint
  from movimientos m
  where m.tipo = p_tipo
    and m.moneda = p_moneda
    and m.fecha >= v_inicio_mes
    and m.fecha < (v_inicio_mes + interval '1 month')::date;
end;
$$;

revoke execute on function registrar_movimiento_manual from public, anon, authenticated;
