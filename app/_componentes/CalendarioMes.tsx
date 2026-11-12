import type { CalendarioMes as DatosCalendario, DiaCalendario, EstadoDia } from "@/lib/panel/calendario.ts";
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

export function CalendarioMes({ calendario }: { calendario: DatosCalendario }) {
  const espacios = Array.from({ length: calendario.espaciosIniciales }, (_, indice) => indice);

  return (
    <section aria-labelledby="titulo-calendario">
      <h2 id="titulo-calendario" className={estilos.titulo}>
        Pagos y cobros del mes
      </h2>

      <div className={estilos.semana} aria-hidden="true">
        {DIAS_SEMANA.map((dia, indice) => (
          <span key={indice}>{dia}</span>
        ))}
      </div>
      <ol className={estilos.calendario}>
        {espacios.map((espacio) => (
          <li key={`espacio-${espacio}`} aria-hidden="true" />
        ))}
        {calendario.dias.map((dia) => (
          <li
            key={dia.dia}
            className={`${estilos.dia} ${CLASE_POR_ESTADO[dia.estado]} ${dia.esHoy ? estilos.diaHoy : ""}`}
            title={descripcionDelDia(dia)}
            aria-label={descripcionDelDia(dia)}
          >
            {dia.dia}
          </li>
        ))}
      </ol>

      <ul className={estilos.leyenda}>
        {LEYENDA.map((estado) => (
          <li key={estado}>
            <span className={`${estilos.muestra} ${CLASE_POR_ESTADO[estado]}`} aria-hidden="true" />
            {TEXTO_POR_ESTADO[estado]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function descripcionDelDia(dia: DiaCalendario): string {
  const hoy = dia.esHoy ? " (hoy)" : "";
  if (dia.estado === "sin-pagos") return `${dia.dia}${hoy}: sin pagos`;
  return `${dia.dia}${hoy}: ${TEXTO_POR_ESTADO[dia.estado]}. ${dia.nombres.join(", ")}`;
}
