import { diaYMes } from "@/lib/fechas/formato.ts";
import { formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import type { MovimientoPanel, OpcionCategoria, PrevistoPanel } from "@/lib/panel/tipos.ts";
import { resolverMovimiento } from "../acciones.ts";
import estilos from "../panel.module.css";
import { SelectorDestino } from "./SelectorDestino.tsx";

type Props = {
  movimientos: MovimientoPanel[];
  previstosAbiertos: PrevistoPanel[];
  categorias: OpcionCategoria[];
};

export function PorRevisar({ movimientos, previstosAbiertos, categorias }: Props) {
  if (movimientos.length === 0) return null;

  return (
    <section aria-labelledby="titulo-revisar" className={estilos.revisar}>
      <h2 id="titulo-revisar" className={estilos.titulo}>
        Por revisar ({movimientos.length})
      </h2>
      <p className={estilos.nota}>No supe a qué corresponden. Elige y quedan ordenados.</p>

      <ul className={estilos.lista}>
        {movimientos.map((movimiento) => (
          <li key={movimiento.id} className={estilos.filaRevisar}>
            <div className={estilos.filaRevisarCabecera}>
              <span>
                <span className={estilos.filaFecha}>{diaYMes(movimiento.fecha)}</span> {movimiento.descripcion}
              </span>
              <span className={`${estilos.cifra} ${movimiento.tipo === "ingreso" ? estilos.ingreso : estilos.egreso}`}>
                {movimiento.tipo === "ingreso" ? "+" : "−"} {formatearMonto(movimiento.montoCentimos, movimiento.moneda)}
              </span>
            </div>

            <form action={resolverMovimiento.bind(null, movimiento.id)} className={estilos.formularioRevisar}>
              <label htmlFor={`destino-${movimiento.id}`} className={estilos.soloLectores}>
                A qué corresponde {movimiento.descripcion}
              </label>
              <SelectorDestino
                id={`destino-${movimiento.id}`}
                tipo={movimiento.tipo}
                moneda={movimiento.moneda}
                previstosAbiertos={previstosAbiertos}
                categorias={categorias}
                opcionVacia={{ texto: "¿A qué corresponde?", obligatoria: true }}
              />
              <button type="submit" className={estilos.boton}>
                Guardar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
