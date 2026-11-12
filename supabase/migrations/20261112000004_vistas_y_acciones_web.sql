-- Lecturas y acciones que usa la web. Todo sigue cerrado a anon/authenticated:
-- la web lee con la clave secreta desde el servidor, tras verificar la sesión.

create view previstos_con_pago with (security_invoker = true) as
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
  coalesce(sum(m.monto_centimos), 0)::integer as pagado_centimos
from previstos p
join categorias_con_nombre c on c.id = p.categoria_id
left join fijos f on f.id = p.fijo_id
left join movimientos m on m.previsto_id = p.id
group by p.id, c.nombre_completo, f.cuotas_total;

-- categoria_raiz agrupa subcategorías bajo su padre (Mascota › Arena → Mascota).
create view movimientos_con_categoria with (security_invoker = true) as
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
  m.creado_en
from movimientos m
left join categorias c on c.id = m.categoria_id
left join categorias p on p.id = c.padre_id
left join previstos pr on pr.id = m.previsto_id;

-- Omitir: este mes no se paga/cobra (o es tu turno en la junta). Reabrir
-- recalcula el estado según lo que ya tenga asociado.
create function cambiar_omision_previsto(p_previsto_id bigint, p_omitir boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_omitir then
    update previstos set estado = 'omitido'
    where id = p_previsto_id and estado in ('pendiente', 'parcial');
    return;
  end if;

  update previstos set estado = 'pendiente'
  where id = p_previsto_id and estado = 'omitido';
  if found then
    perform recalcular_previsto(p_previsto_id);
  end if;
end;
$$;

-- Resuelve un movimiento "por revisar": se le asigna un previsto (y hereda su
-- categoría) o solo una categoría. El tipo debe coincidir para no mezclar
-- ingresos con egresos.
create function resolver_movimiento(p_movimiento_id bigint, p_categoria_id bigint, p_previsto_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movimiento movimientos%rowtype;
  v_categoria_id bigint := p_categoria_id;
begin
  select * into v_movimiento from movimientos where id = p_movimiento_id for update;
  if not found then
    raise exception 'El movimiento % no existe', p_movimiento_id;
  end if;

  if p_previsto_id is not null then
    select categoria_id into v_categoria_id
    from previstos
    where id = p_previsto_id and tipo = v_movimiento.tipo;
    if not found or v_movimiento.moneda <> 'PEN' then
      raise exception 'El previsto no corresponde a este movimiento';
    end if;
  elsif not exists (select 1 from categorias where id = p_categoria_id and tipo = v_movimiento.tipo) then
    raise exception 'La categoría no corresponde a este movimiento';
  end if;

  update movimientos
  set categoria_id = v_categoria_id,
      origen_categoria = 'manual',
      por_revisar = false,
      previsto_id = p_previsto_id
  where id = p_movimiento_id;

  if v_movimiento.previsto_id is not null and v_movimiento.previsto_id is distinct from p_previsto_id then
    perform recalcular_previsto(v_movimiento.previsto_id);
  end if;
  if p_previsto_id is not null then
    perform recalcular_previsto(p_previsto_id);
  end if;
end;
$$;

-- Para corregir errores de dictado. Si estaba asociado a un previsto, este
-- vuelve al estado que le corresponde sin ese pago.
create function eliminar_movimiento(p_movimiento_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previsto_id bigint;
begin
  delete from movimientos where id = p_movimiento_id returning previsto_id into v_previsto_id;
  if v_previsto_id is not null then
    perform recalcular_previsto(v_previsto_id);
  end if;
end;
$$;

revoke execute on function cambiar_omision_previsto from public, anon, authenticated;
revoke execute on function resolver_movimiento from public, anon, authenticated;
revoke execute on function eliminar_movimiento from public, anon, authenticated;
