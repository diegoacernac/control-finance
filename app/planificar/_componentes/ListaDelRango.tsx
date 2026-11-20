import { diaYMes, nombreDelMes } from "@/lib/fechas/formato.ts";
import { formatearCifra, formatearConSigno } from "@/lib/movimientos/formato-monto.ts";
import type { GrupoDelMes } from "@/lib/planificar/lista-del-rango.ts";
import { estaAbierto, restanteCentimos } from "@/lib/planificar/proyectar-meses.ts";
import { SelectorTipo } from "./SelectorRango.tsx";
import type { RangoPlan } from "@/lib/planificar/rango.ts";
import type { FiltroTipo, PrevistoPlan } from "@/lib/planificar/tipos.ts";
import { omitirPrevisto, reabrirPrevisto } from "../../acciones.ts";
import estilosPanel from "../../panel.module.css";
import estilos from "../planificar.module.css";
import { BotonEnviar } from "../../_componentes/BotonEnviar.tsx";

const TITULO: Record<FiltroTipo, string> = {
  todo: "Pagos y cobros",
  egreso: "Gastos que vienen",
  ingreso: "Ingresos que vienen",
};

// Omitir aquí es decidir con anticipación ("en marzo no pago HBO"): el mes
// siguiente de la tabla se recalcula sin ese pago.
export function ListaDelRango({ grupos, rango }: { grupos: GrupoDelMes[]; rango: RangoPlan }) {
  return (
    <section aria-labelledby="titulo-lista">
      <h2 id="titulo-lista" className={estilos.titulo}>
        {TITULO[rango.tipo]}
      </h2>
      <SelectorTipo rango={rango} />

      {grupos.length === 0 && <p className={estilosPanel.vacio}>No hay nada previsto en estas fechas.</p>}

      {grupos.map((grupo) => (
        <div key={grupo.mes}>
          <h3 className={estilosPanel.subtitulo}>
            {nombreDelMes(grupo.mes)}
            <span className={estilos.totalesGrupo}>{totalesDelGrupo(grupo.previstos)}</span>
          </h3>
          <ul className={estilosPanel.lista}>
            {grupo.previstos.map((previsto) => (
              <FilaPlan key={previsto.id} previsto={previsto} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function FilaPlan({ previsto }: { previsto: PrevistoPlan }) {
  const omitido = previsto.estado === "omitido";
  const centimos = omitido ? previsto.montoEsperadoCentimos : restanteCentimos(previsto);
  const claseMonto = omitido ? estilosPanel.tachado : previsto.tipo === "ingreso" ? estilosPanel.ingreso : estilosPanel.egreso;

  return (
    <li className={estilosPanel.fila}>
      <span className={estilosPanel.filaFecha}>{diaYMes(previsto.fechaEsperada!)}</span>
      <span className={omitido ? estilosPanel.tachado : estilosPanel.filaNombre}>
        {previsto.nombre}
        {previsto.persona && previsto.persona !== previsto.nombre ? ` · ${previsto.persona}` : ""}
      </span>
      <span className={`${estilosPanel.cifra} ${claseMonto}`}>{formatearConSigno(previsto.tipo, centimos)}</span>

      <div className={estilosPanel.filaDetalle}>
        {detalles(previsto).join(" · ")}
        <form action={(omitido ? reabrirPrevisto : omitirPrevisto).bind(null, previsto.id)} className={estilosPanel.enLinea}>
          <BotonEnviar className={estilosPanel.botonTexto} textoEnviando={omitido ? "Reabriendo…" : "Omitiendo…"}>
            {omitido ? "Reabrir" : "Omitir"}
          </BotonEnviar>
        </form>
      </div>
    </li>
  );
}

function detalles(previsto: PrevistoPlan): string[] {
  const partes = [previsto.categoriaNombre];
  if (previsto.numeroCuota && previsto.cuotasTotal) partes.push(`cuota ${previsto.numeroCuota} de ${previsto.cuotasTotal}`);
  if (previsto.planeado) partes.push("planeado");
  if (previsto.estado === "parcial") partes.push(`faltan ${formatearCifra(restanteCentimos(previsto))}`);
  if (previsto.estado === "omitido") partes.push("omitido");
  return partes;
}

function totalesDelGrupo(previstos: PrevistoPlan[]): string {
  const abiertos = previstos.filter(estaAbierto);
  const entra = abiertos.filter((p) => p.tipo === "ingreso").reduce((s, p) => s + restanteCentimos(p), 0);
  const sale = abiertos.filter((p) => p.tipo === "egreso").reduce((s, p) => s + restanteCentimos(p), 0);
  const partes = [];
  if (entra > 0) partes.push(`+ ${formatearCifra(entra)}`);
  if (sale > 0) partes.push(`− ${formatearCifra(sale)}`);
  return partes.join("  ");
}
