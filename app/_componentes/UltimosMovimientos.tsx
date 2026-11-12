import { diaYMes } from "@/lib/fechas/formato.ts";
import { formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import type { MovimientoPanel, OpcionCategoria, PrevistoPanel } from "@/lib/panel/tipos.ts";
import { eliminarMovimiento } from "../acciones.ts";
import estilos from "../panel.module.css";
import { EditarMovimiento } from "./EditarMovimiento.tsx";

type Props = {
  movimientos: MovimientoPanel[];
  previstosAbiertos: PrevistoPanel[];
  categorias: OpcionCategoria[];
};

export function UltimosMovimientos({ movimientos, previstosAbiertos, categorias }: Props) {
  return (
    <section aria-labelledby="titulo-ultimos">
      <h2 id="titulo-ultimos" className={estilos.titulo}>
        Últimos registros
      </h2>

      {movimientos.length === 0 ? (
        <p className={estilos.vacio}>Dicta tu primer movimiento desde el atajo o anótalo arriba.</p>
      ) : (
        <ul className={estilos.lista}>
          {movimientos.map((movimiento) => (
            <li key={movimiento.id} className={estilos.fila}>
              <span className={estilos.filaFecha}>{diaYMes(movimiento.fecha)}</span>
              <span className={estilos.filaNombre}>{movimiento.descripcion}</span>
              <span className={`${estilos.cifra} ${movimiento.tipo === "ingreso" ? estilos.ingreso : estilos.egreso}`}>
                {movimiento.tipo === "ingreso" ? "+" : "−"} {formatearMonto(movimiento.montoCentimos, movimiento.moneda)}
              </span>

              <div className={estilos.filaDetalle}>
                {movimiento.previstoNombre ?? movimiento.categoriaNombre ?? "Sin categoría"}
                <details className={estilos.desplegable}>
                  <summary className={estilos.botonTexto}>Editar</summary>
                  <EditarMovimiento movimiento={movimiento} previstosAbiertos={previstosAbiertos} categorias={categorias} />
                </details>
                {/* Dos pasos para no borrar por un toque accidental. */}
                <details className={estilos.confirmar}>
                  <summary className={estilos.botonTexto}>Eliminar</summary>
                  <form action={eliminarMovimiento.bind(null, movimiento.id)} className={estilos.enLinea}>
                    <button type="submit" className={estilos.botonPeligro}>
                      Sí, eliminar
                    </button>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
