import { diaYMes } from "@/lib/fechas/formato.ts";
import type { Moneda, TipoMovimiento } from "@/lib/movimientos/tipos.ts";
import { valorDestino } from "@/lib/panel/destino.ts";
import type { OpcionCategoria, PrevistoPanel } from "@/lib/panel/tipos.ts";
import estilos from "../panel.module.css";

type Props = {
  id: string;
  tipo: TipoMovimiento;
  moneda: Moneda;
  previstosAbiertos: PrevistoPanel[];
  categorias: OpcionCategoria[];
  // Texto de la primera opción (valor vacío). Si es obligatoria, no se puede elegir.
  opcionVacia: { texto: string; obligatoria: boolean };
};

export function SelectorDestino({ id, tipo, moneda, previstosAbiertos, categorias, opcionVacia }: Props) {
  // Los fijos están en soles: un movimiento en dólares solo puede ir a categoría.
  const previstos = moneda === "PEN" ? previstosAbiertos.filter((p) => p.tipo === tipo) : [];

  return (
    <select id={id} name="destino" required={opcionVacia.obligatoria} defaultValue="" className={estilos.selector}>
      <option value="" disabled={opcionVacia.obligatoria}>
        {opcionVacia.texto}
      </option>

      {previstos.length > 0 && (
        <optgroup label="Es un pago o cobro esperado">
          {previstos.map((previsto) => (
            <option key={previsto.id} value={valorDestino("previsto", previsto.id)}>
              {previsto.nombre}
              {previsto.persona && previsto.persona !== previsto.nombre ? ` · ${previsto.persona}` : ""}
              {previsto.fechaEsperada ? ` (${diaYMes(previsto.fechaEsperada)})` : ""}
            </option>
          ))}
        </optgroup>
      )}

      <optgroup label="Solo categoría">
        {categorias
          .filter((categoria) => categoria.tipo === tipo)
          .map((categoria) => (
            <option key={categoria.id} value={valorDestino("categoria", categoria.id)}>
              {categoria.nombre}
            </option>
          ))}
      </optgroup>
    </select>
  );
}
