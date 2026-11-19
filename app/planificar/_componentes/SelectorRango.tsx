import Link from "next/link";
import { inicioDeMes } from "@/lib/fechas/lima.ts";
import { limiteDelHorizonte, type RangoPlan, type Vista } from "@/lib/planificar/rango.ts";
import type { FiltroTipo } from "@/lib/planificar/tipos.ts";
import estilosPanel from "../../panel.module.css";
import estilos from "../planificar.module.css";

const VISTAS: { valor: Exclude<Vista, "fechas">; etiqueta: string }[] = [
  { valor: "siguiente", etiqueta: "Mes siguiente" },
  { valor: "3m", etiqueta: "3 meses" },
  { valor: "6m", etiqueta: "6 meses" },
];

const TIPOS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: "todo", etiqueta: "Todo" },
  { valor: "egreso", etiqueta: "Gastos" },
  { valor: "ingreso", etiqueta: "Ingresos" },
];

// Todo va en la URL (?ver=&tipo=&desde=&hasta=): se puede volver atrás o
// guardar una vista como enlace.
export function SelectorRango({ rango, hoy }: { rango: RangoPlan; hoy: string }) {
  return (
    <section aria-label="Rango y filtro" className={estilos.selector}>
      <nav aria-label="Rango" className={estilos.segmentos}>
        {VISTAS.map((vista) => (
          <Link
            key={vista.valor}
            href={enlace({ ver: vista.valor, tipo: rango.tipo })}
            aria-current={rango.vista === vista.valor ? "page" : undefined}
            className={estilos.segmento}
          >
            {vista.etiqueta}
          </Link>
        ))}
      </nav>

      <nav aria-label="Tipo" className={estilos.segmentos}>
        {TIPOS.map((tipo) => (
          <Link
            key={tipo.valor}
            href={enlace({ ...parametrosDeVista(rango), tipo: tipo.valor })}
            aria-current={rango.tipo === tipo.valor ? "page" : undefined}
            className={estilos.segmento}
          >
            {tipo.etiqueta}
          </Link>
        ))}
      </nav>

      <details className={estilos.fechas} open={rango.vista === "fechas"}>
        <summary className={estilosPanel.botonTexto}>Elegir fechas</summary>
        <form className={estilos.formularioFechas}>
          <input type="hidden" name="ver" value="fechas" />
          <input type="hidden" name="tipo" value={rango.tipo} />
          <div className={estilosPanel.campoEdicion}>
            <label htmlFor="rango-desde">Desde</label>
            <input
              id="rango-desde"
              name="desde"
              type="date"
              required
              defaultValue={rango.desde}
              min={inicioDeMes(hoy)}
              max={limiteDelHorizonte(hoy)}
              className={estilosPanel.selector}
            />
          </div>
          <div className={estilosPanel.campoEdicion}>
            <label htmlFor="rango-hasta">Hasta</label>
            <input
              id="rango-hasta"
              name="hasta"
              type="date"
              required
              defaultValue={rango.hasta}
              min={inicioDeMes(hoy)}
              max={limiteDelHorizonte(hoy)}
              className={estilosPanel.selector}
            />
          </div>
          <button type="submit" className={estilosPanel.boton}>
            Ver
          </button>
        </form>
      </details>

      {rango.aviso && (
        <p role="alert" className={estilosPanel.mensajeError}>
          {rango.aviso}
        </p>
      )}
    </section>
  );
}

function parametrosDeVista(rango: RangoPlan): Record<string, string> {
  if (rango.vista === "fechas") return { ver: "fechas", desde: rango.desde, hasta: rango.hasta };
  return { ver: rango.vista };
}

function enlace(parametros: Record<string, string>): string {
  const { tipo, ...resto } = parametros;
  const conTipo = tipo === "todo" ? resto : parametros;
  return `/planificar?${new URLSearchParams(conTipo).toString()}`;
}
