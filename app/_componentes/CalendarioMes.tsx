"use client";

import { useState } from "react";
import { diaYMes } from "@/lib/fechas/formato.ts";
import { sumarDias } from "@/lib/fechas/lima.ts";
import { formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import { estaAbierto, restanteCentimos } from "@/lib/panel/proyeccion.ts";
import type { PrevistoPanel } from "@/lib/panel/tipos.ts";
import { ConfirmarPrevisto } from "./ConfirmarPrevisto.tsx";
import type { CalendarioMes as DatosCalendario, DiaCalendario, EstadoDia } from "@/lib/panel/calendario.ts";
import vista from "./calendario.module.css";
import estilos from "../panel.module.css";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const CLASE_POR_ESTADO: Record<EstadoDia, string> = {
  "sin-pagos": estilos.diaSinPagos,
  resuelto: estilos.diaResuelto,
  pendiente: estilos.diaPendiente,
  parcial: estilos.diaParcial,
  atrasado: estilos.diaAtrasado,
};

const TEXTO_POR_ESTADO: Record<EstadoDia, string> = {
  "sin-pagos": "sin pagos",
  resuelto: "resuelto",
  pendiente: "pendiente",
  parcial: "parcial",
  atrasado: "atrasado",
};

const LEYENDA: EstadoDia[] = ["resuelto", "pendiente", "parcial", "atrasado"];

type Props = { calendario: DatosCalendario; previstos: PrevistoPanel[]; hoy: string };

export function CalendarioMes({ calendario, previstos, hoy }: Props) {
  const [verMes, setVerMes] = useState(false);
  const [seleccion, seleccionar] = useState(hoy);
  const finSemana = sumarDias(hoy, 7);
  const abiertos = previstos.filter(estaAbierto)
    .sort((a, b) => (a.fechaEsperada ?? "").localeCompare(b.fechaEsperada ?? "") || a.id - b.id);
  const grupos = [
    { nombre: "Atrasados", items: abiertos.filter(p => p.fechaEsperada && p.fechaEsperada < hoy) },
    { nombre: "Hoy", items: abiertos.filter(p => p.fechaEsperada === hoy) },
    { nombre: "Próximos 7 días", items: abiertos.filter(p => p.fechaEsperada && p.fechaEsperada > hoy && p.fechaEsperada <= finSemana) },
  ];
  const delDia = previstos.filter(p => p.fechaEsperada === seleccion);
  const espacios = Array.from({ length: calendario.espaciosIniciales }, (_, indice) => indice);

  return (
    <section aria-labelledby="titulo-calendario">
      <h2 id="titulo-calendario" className={estilos.titulo}>
        Pagos y cobros
      </h2>

      <button type="button" className={vista.cambiarVista} onClick={() => setVerMes(!verMes)}>
        {verMes ? "Volver a la agenda" : "Ver calendario del mes"}
      </button>
      {!verMes && (
        <div className={vista.agendaMovil}>
          {grupos.map(({ nombre, items }) => (
            <details key={nombre} className={vista.grupoAgenda} open={nombre === "Hoy"}>
              <summary>{nombre} ({items.length})</summary>
              {items.length ? <ListaAgenda previstos={items} hoy={hoy} /> : <p className={estilos.vacio}>Sin pendientes.</p>}
            </details>
          ))}
        </div>
      )}
      <div className={verMes ? undefined : vista.mesEnEscritorio}>
        <div className={estilos.semana} aria-hidden="true">
          {DIAS_SEMANA.map((dia, indice) => (
            <span key={indice}>{dia}</span>
          ))}
        </div>
        <ol className={estilos.calendario}>
          {espacios.map((espacio) => (
            <li key={`espacio-${espacio}`} aria-hidden="true" />
          ))}
          {calendario.dias.map((dia) => {
            const fecha = hoy.slice(0, 8) + String(dia.dia).padStart(2, "0");
            return (
              <li key={dia.dia}>
                <button
                  type="button"
                  className={`${estilos.dia} ${CLASE_POR_ESTADO[dia.estado]} ${dia.esHoy ? estilos.diaHoy : ""}`}
                  aria-label={descripcionDelDia(dia)}
                  aria-pressed={seleccion === fecha}
                  aria-current={dia.esHoy ? "date" : undefined}
                  onClick={() => seleccionar(fecha)}
                >
                  {dia.dia}
                </button>
              </li>
            );
          })}
        </ol>

        <ul className={estilos.leyenda}>
          {LEYENDA.map((estado) => (
            <li key={estado}>
              <span className={`${estilos.muestra} ${CLASE_POR_ESTADO[estado]}`} aria-hidden="true" />
              {TEXTO_POR_ESTADO[estado]}
            </li>
          ))}
        </ul>
        <h3 className={estilos.subtitulo} aria-live="polite">{diaYMes(seleccion)} · {delDia.length} {delDia.length === 1 ? "registro" : "registros"}</h3>
        {delDia.length ? <ListaAgenda previstos={delDia} hoy={hoy} /> : <p className={estilos.vacio}>Sin pagos ni cobros previstos.</p>}
      </div>
    </section>
  );
}

function descripcionDelDia(dia: DiaCalendario): string {
  const hoy = dia.esHoy ? " (hoy)" : "";
  if (dia.estado === "sin-pagos") return `${dia.dia}${hoy}: sin pagos`;
  return `${dia.dia}${hoy}: ${TEXTO_POR_ESTADO[dia.estado]}. ${dia.nombres.join(", ")}`;
}

function ListaAgenda({ previstos, hoy }: { previstos: PrevistoPanel[]; hoy: string }) {
  return (
    <ul className={estilos.lista}>
      {previstos.map((p) => {
        const abierto = estaAbierto(p);
        const monto = abierto ? restanteCentimos(p) : p.pagadoCentimos;
        const cobro = p.tipo === "ingreso";
        const estado = abierto ? (p.estado === "parcial" ? "Saldo pendiente" : "Pendiente") : "Resuelto";
        return (
          <li key={p.id} className={vista.itemAgenda}>
            <strong>{p.nombre}{p.persona && p.persona !== p.nombre && ` · ${p.persona}`}</strong>
            <span className={cobro ? estilos.ingreso : estilos.egreso}>
              {cobro ? "+" : "−"} {formatearMonto(monto, "PEN")}
            </span>
            <small>{p.fechaEsperada && diaYMes(p.fechaEsperada)} · {cobro ? "Cobro" : "Pago"} · {estado}</small>
            {abierto && (
              <details>
                <summary className={estilos.botonTexto}>Confirmar</summary>
                <ConfirmarPrevisto key={monto} previstoId={p.id} restanteCentimos={monto} hoy={hoy} esCobro={cobro} />
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
