import { formatearCifra, formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import type { GastoDelMes } from "@/lib/panel/gasto-por-categoria.ts";
import estilos from "../panel.module.css";

export function GastoPorCategoria({ gasto }: { gasto: GastoDelMes }) {
  return (
    <section aria-labelledby="titulo-gasto">
      <h2 id="titulo-gasto" className={estilos.titulo}>
        Gastado este mes
      </h2>

      {gasto.categorias.length === 0 ? (
        <p className={estilos.vacio}>Todavía no registras gastos este mes.</p>
      ) : (
        <>
          <p className={estilos.totalGasto}>{formatearMonto(gasto.totalCentimos, "PEN")}</p>
          <ul className={estilos.lista}>
            {gasto.categorias.map((categoria) => (
              <li key={categoria.nombre} className={estilos.filaGasto}>
                <span>{categoria.nombre}</span>
                <span className={estilos.cifra}>{formatearCifra(categoria.centimos)}</span>
                <span className={estilos.barra} aria-hidden="true">
                  <span style={{ width: `${categoria.porcentaje}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
