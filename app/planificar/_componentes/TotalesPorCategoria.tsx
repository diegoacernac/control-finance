import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import type { TotalCategoria } from "@/lib/planificar/lista-del-rango.ts";
import estilosPanel from "../../panel.module.css";
import estilos from "../planificar.module.css";

// Suma lo que falta de lo que muestra la lista (mismo rango y filtro).
export function TotalesPorCategoria({ totales }: { totales: TotalCategoria[] }) {
  if (totales.length === 0) return null;
  const gastos = totales.filter((t) => t.tipo === "egreso");
  const ingresos = totales.filter((t) => t.tipo === "ingreso");

  return (
    <section aria-labelledby="titulo-categorias">
      <h2 id="titulo-categorias" className={estilos.titulo}>
        Por categoría
      </h2>
      <Grupo titulo="Gastos" totales={gastos} clase={estilosPanel.egreso} />
      <Grupo titulo="Ingresos" totales={ingresos} clase={estilosPanel.ingreso} />
    </section>
  );
}

function Grupo({ titulo, totales, clase }: { titulo: string; totales: TotalCategoria[]; clase: string }) {
  if (totales.length === 0) return null;
  const suma = totales.reduce((s, t) => s + t.totalCentimos, 0);

  return (
    <>
      <h3 className={estilosPanel.subtitulo}>
        {titulo}
        <span className={estilos.totalesGrupo}>{formatearCifra(suma)}</span>
      </h3>
      <ul className={estilosPanel.lista}>
        {totales.map((total) => (
          <li key={total.nombre} className={estilos.filaSimple}>
            <span>{total.nombre}</span>
            <span className={`${estilosPanel.cifra} ${clase}`}>{formatearCifra(total.totalCentimos)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
