import { finDeMes, inicioDeMes, mesDespues } from "../fechas/lima.ts";
import { esAhorro, type PrevistoPlan } from "./tipos.ts";

export type MesProyectado = {
  mes: string;
  inicioCentimos: number;
  entraCentimos: number;
  fijosCentimos: number;
  unicosCentimos: number;
  variableCentimos: number;
  // Lo que queda después de vivir el mes: lo que podrías ahorrar.
  libreCentimos: number;
  ahorroCentimos: number;
  cierreCentimos: number;
};

export type EntradaProyeccion = {
  hoy: string;
  hasta: string;
  saldoCentimos: number;
  previstos: PrevistoPlan[];
  gastoVariableMensualCentimos: number;
  // Gastado este mes en lo que no es fijo (comida, taxis): se descuenta del
  // estimado, porque ya salió del saldo de hoy.
  gastoVariableDelMesCentimos: number;
};

export function estaAbierto(previsto: PrevistoPlan): boolean {
  return previsto.estado === "pendiente" || previsto.estado === "parcial";
}

export function restanteCentimos(previsto: PrevistoPlan): number {
  return Math.max(previsto.montoEsperadoCentimos - previsto.pagadoCentimos, 0);
}

// Mes a mes desde el actual hasta el de `hasta`. El primero parte del saldo de
// hoy y suma solo lo que falta (incluye lo atrasado, que sigue debiéndose);
// los siguientes parten del cierre del anterior. Lo omitido y lo que no tiene
// fecha no cuenta: no se sabe cuándo llega.
export function proyectarMeses(entrada: EntradaProyeccion): MesProyectado[] {
  const conFecha = entrada.previstos.filter((p) => estaAbierto(p) && p.fechaEsperada !== null);
  const ultimoMes = inicioDeMes(entrada.hasta);
  const meses: MesProyectado[] = [];
  let inicioCentimos = entrada.saldoCentimos;

  for (let mes = inicioDeMes(entrada.hoy); mes <= ultimoMes; mes = mesDespues(mes, 1)) {
    const esElActual = meses.length === 0;
    const delMes = conFecha.filter((p) => p.fechaEsperada! <= finDeMes(mes) && (esElActual || p.fechaEsperada! >= mes));
    const variableCentimos = esElActual
      ? Math.max(entrada.gastoVariableMensualCentimos - entrada.gastoVariableDelMesCentimos, 0)
      : entrada.gastoVariableMensualCentimos;

    const proyectado = proyectarMes(mes, inicioCentimos, delMes, variableCentimos);
    meses.push(proyectado);
    inicioCentimos = proyectado.cierreCentimos;
  }

  return meses;
}

function proyectarMes(mes: string, inicioCentimos: number, previstos: PrevistoPlan[], variableCentimos: number): MesProyectado {
  const egresos = previstos.filter((p) => p.tipo === "egreso");
  const ahorros = egresos.filter(esAhorro);
  const gastos = egresos.filter((p) => !esAhorro(p));

  const entraCentimos = sumarRestante(previstos.filter((p) => p.tipo === "ingreso"));
  const fijosCentimos = sumarRestante(gastos.filter((p) => p.fijoId !== null));
  const unicosCentimos = sumarRestante(gastos.filter((p) => p.fijoId === null));
  const ahorroCentimos = sumarRestante(ahorros);
  const libreCentimos = entraCentimos - fijosCentimos - unicosCentimos - variableCentimos;

  return {
    mes,
    inicioCentimos,
    entraCentimos,
    fijosCentimos,
    unicosCentimos,
    variableCentimos,
    libreCentimos,
    ahorroCentimos,
    cierreCentimos: inicioCentimos + libreCentimos - ahorroCentimos,
  };
}

function sumarRestante(previstos: PrevistoPlan[]): number {
  return previstos.reduce((suma, p) => suma + restanteCentimos(p), 0);
}
