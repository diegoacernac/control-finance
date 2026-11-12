-- Corrige un movimiento mal dictado (monto, fecha, descripción) y, si se pide,
-- a qué corresponde. Recalcula el previsto anterior y el nuevo para que sus
-- estados reflejen el monto corregido. Tipo y moneda no se editan: si están
-- mal, se elimina y se vuelve a registrar.
create function editar_movimiento(
  p_movimiento_id bigint,
  p_monto_centimos integer,
  p_fecha date,
  p_descripcion text,
  p_cambiar_destino boolean,
  p_categoria_id bigint,
  p_previsto_id bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movimiento movimientos%rowtype;
  v_categoria_id bigint;
  v_previsto_id bigint;
  v_origen origen_categoria;
begin
  select * into v_movimiento from movimientos where id = p_movimiento_id for update;
  if not found then
    raise exception 'El movimiento no existe';
  end if;

  if p_monto_centimos is null or p_monto_centimos <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;
  if length(trim(coalesce(p_descripcion, ''))) = 0 then
    raise exception 'Falta la descripción';
  end if;

  v_categoria_id := v_movimiento.categoria_id;
  v_previsto_id := v_movimiento.previsto_id;
  v_origen := v_movimiento.origen_categoria;

  if p_cambiar_destino then
    if p_previsto_id is not null then
      select categoria_id into v_categoria_id
      from previstos
      where id = p_previsto_id and tipo = v_movimiento.tipo;
      if not found or v_movimiento.moneda <> 'PEN' then
        raise exception 'El previsto no corresponde a este movimiento';
      end if;
    elsif not exists (select 1 from categorias where id = p_categoria_id and tipo = v_movimiento.tipo) then
      raise exception 'La categoría no corresponde a este movimiento';
    else
      v_categoria_id := p_categoria_id;
    end if;
    v_previsto_id := p_previsto_id;
    v_origen := 'manual';
  end if;

  update movimientos
  set monto_centimos = p_monto_centimos,
      fecha = p_fecha,
      descripcion = trim(p_descripcion),
      categoria_id = v_categoria_id,
      previsto_id = v_previsto_id,
      origen_categoria = v_origen,
      por_revisar = v_categoria_id is null
  where id = p_movimiento_id;

  if v_movimiento.previsto_id is not null and v_movimiento.previsto_id is distinct from v_previsto_id then
    perform recalcular_previsto(v_movimiento.previsto_id);
  end if;
  if v_previsto_id is not null then
    perform recalcular_previsto(v_previsto_id);
  end if;
end;
$$;

revoke execute on function editar_movimiento from public, anon, authenticated;
