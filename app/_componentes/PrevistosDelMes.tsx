import { diaYMes } from "@/lib/fechas/formato.ts";
import { formatearCifra, formatearConSigno } from "@/lib/movimientos/formato-monto.ts";
import type { PrevistosAgrupados } from "@/lib/panel/agrupar-previstos.ts";
import { estaAbierto, restanteCentimos } from "@/lib/panel/proyeccion.ts";
import type { PrevistoPanel } from "@/lib/panel/tipos.ts";
import { omitirPrevisto, reabrirPrevisto } from "../acciones.ts";
import estilos from "../panel.module.css";

export function PrevistosDelMes({ grupos }: { grupos: PrevistosAgrupados }) {
  const nadaAbierto = grupos.atrasados.length + grupos.proximos.length + grupos.sinFecha.length === 0;

  return (
    <section aria-labelledby="titulo-previstos">
      <h2 id="titulo-previstos" className={estilos.titulo}>
        Lo que viene
      </h2>

      {nadaAbierto && <p className={estilos.vacio}>No queda nada por pagar ni cobrar este mes.</p>}

      <Grupo titulo="Atrasado" previstos={grupos.atrasados} resaltado />
      <Grupo titulo="Este mes" previstos={grupos.proximos} />
      <Grupo titulo="Sin fecha" previstos={grupos.sinFecha} />

      <GrupoPlegable titulo="Más adelante" previstos={grupos.masAdelante} />
      <GrupoPlegable titulo="Resuelto este mes" previstos={grupos.resueltos} />
    </section>
  );
}

function Grupo({ titulo, previstos, resaltado = false }: { titulo: string; previstos: PrevistoPanel[]; resaltado?: boolean }) {
  if (previstos.length === 0) return null;

  return (
    <>
      <h3 className={`${estilos.subtitulo} ${resaltado ? estilos.subtituloAtrasado : ""}`}>{titulo}</h3>
      <ul className={estilos.lista}>
        {previstos.map((previsto) => (
          <FilaPrevisto key={previsto.id} previsto={previsto} />
        ))}
      </ul>
    </>
  );
}

function GrupoPlegable({ titulo, previstos }: { titulo: string; previstos: PrevistoPanel[] }) {
  if (previstos.length === 0) return null;

  return (
    <details className={estilos.plegable}>
      <summary>
        {titulo} ({previstos.length})
      </summary>
      <ul className={estilos.lista}>
        {previstos.map((previsto) => (
          <FilaPrevisto key={previsto.id} previsto={previsto} />
        ))}
      </ul>
    </details>
  );
}

function FilaPrevisto({ previsto }: { previsto: PrevistoPanel }) {
  const abierto = estaAbierto(previsto);
  const omitido = previsto.estado === "omitido";
  const centimos = abierto ? restanteCentimos(previsto) : omitido ? previsto.montoEsperadoCentimos : previsto.pagadoCentimos;
  const claseMonto = omitido ? estilos.tachado : previsto.tipo === "ingreso" ? estilos.ingreso : estilos.egreso;

  return (
    <li className={estilos.fila}>
      <span className={estilos.filaFecha}>{previsto.fechaEsperada ? diaYMes(previsto.fechaEsperada) : "—"}</span>
      <span className={omitido ? estilos.tachado : estilos.filaNombre}>
        {previsto.nombre}
        {previsto.persona && previsto.persona !== previsto.nombre ? ` · ${previsto.persona}` : ""}
      </span>
      <span className={`${estilos.cifra} ${claseMonto}`}>{formatearConSigno(previsto.tipo, centimos)}</span>

      <div className={estilos.filaDetalle}>
        {detalles(previsto).join(" · ")}
        {abierto && (
          <form action={omitirPrevisto.bind(null, previsto.id)} className={estilos.enLinea}>
            <button type="submit" className={estilos.botonTexto}>
              Omitir
            </button>
          </form>
        )}
        {omitido && (
          <form action={reabrirPrevisto.bind(null, previsto.id)} className={estilos.enLinea}>
            <button type="submit" className={estilos.botonTexto}>
              Reabrir
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function detalles(previsto: PrevistoPanel): string[] {
  const partes = [previsto.categoriaNombre];
  if (previsto.numeroCuota && previsto.cuotasTotal) partes.push(`cuota ${previsto.numeroCuota} de ${previsto.cuotasTotal}`);
  if (previsto.estado === "parcial") {
    const verbo = previsto.tipo === "ingreso" ? "recibido" : "pagado";
    partes.push(`${verbo} ${formatearCifra(previsto.pagadoCentimos)} de ${formatearCifra(previsto.montoEsperadoCentimos)}`);
  }
  if (previsto.estado === "omitido") partes.push("omitido");
  return partes;
}
