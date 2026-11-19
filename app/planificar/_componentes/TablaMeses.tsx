import { nombreDelMes } from "@/lib/fechas/formato.ts";
import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import type { MesProyectado } from "@/lib/planificar/proyectar-meses.ts";
import estilos from "../planificar.module.css";

type Columna = { etiqueta: string; valor: (mes: MesProyectado) => number; signo: "+" | "−" };

const COLUMNAS: Columna[] = [
  { etiqueta: "Entra", valor: (m) => m.entraCentimos, signo: "+" },
  { etiqueta: "Fijos y cuotas", valor: (m) => m.fijosCentimos, signo: "−" },
  { etiqueta: "Únicos", valor: (m) => m.unicosCentimos, signo: "−" },
  { etiqueta: "Variable", valor: (m) => m.variableCentimos, signo: "−" },
];

// Una fila por mes, como en la hoja de cálculo. En el celular cada mes se
// vuelve un bloque con sus etiquetas (data-etiqueta en CSS).
export function TablaMeses({ meses }: { meses: MesProyectado[] }) {
  return (
    <section aria-labelledby="titulo-meses">
      <h2 id="titulo-meses" className={estilos.titulo}>
        Mes a mes
      </h2>
      <table className={estilos.tabla}>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Empiezas</th>
            {COLUMNAS.map((columna) => (
              <th key={columna.etiqueta} scope="col">
                {columna.etiqueta}
              </th>
            ))}
            <th scope="col">Libre</th>
            <th scope="col">Ahorro</th>
            <th scope="col">Cierras</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes, indice) => (
            <tr key={mes.mes}>
              <th scope="row">
                {nombreDelMes(mes.mes)}
                {indice === 0 && <span className={estilos.notaMes}> lo que falta</span>}
              </th>
              <td data-etiqueta="Empiezas">{formatearConSignoReal(mes.inicioCentimos)}</td>
              {COLUMNAS.map((columna) => (
                <td key={columna.etiqueta} data-etiqueta={columna.etiqueta}>
                  {cifraConSigno(columna.valor(mes), columna.signo)}
                </td>
              ))}
              <td data-etiqueta="Libre" className={mes.libreCentimos < 0 ? estilos.negativo : estilos.libre}>
                {formatearConSignoReal(mes.libreCentimos)}
              </td>
              <td data-etiqueta="Ahorro">{cifraConSigno(mes.ahorroCentimos, "−")}</td>
              <td data-etiqueta="Cierras" className={`${estilos.cierre} ${mes.cierreCentimos < 0 ? estilos.negativo : ""}`}>
                {formatearConSignoReal(mes.cierreCentimos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={estilos.leyendaTabla}>
        Libre = lo que entra menos fijos, únicos y gasto variable: lo que podrías ahorrar. Lo omitido y lo que no tiene
        fecha no cuenta.
      </p>
    </section>
  );
}

function cifraConSigno(centimos: number, signo: Columna["signo"]): string {
  return centimos === 0 ? "—" : `${signo} ${formatearCifra(centimos)}`;
}

function formatearConSignoReal(centimos: number): string {
  return centimos < 0 ? `− ${formatearCifra(-centimos)}` : formatearCifra(centimos);
}
