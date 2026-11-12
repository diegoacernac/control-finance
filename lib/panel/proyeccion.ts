import type { PrevistoPanel } from "./tipos.ts";

export type Proyeccion = {
  saldoCentimos: number;
  porCobrarCentimos: number;
  porPagarCentimos: number;
  cierreCentimos: number;
};

export function estaAbierto(previsto: PrevistoPanel): boolean {
  return previsto.estado === "pendiente" || previsto.estado === "parcial";
}

export function restanteCentimos(previsto: PrevistoPanel): number {
  return Math.max(previsto.montoEsperadoCentimos - previsto.pagadoCentimos, 0);
}

// "Con cuánto cierras el mes": saldo de hoy más lo que falta cobrar menos lo
// que falta pagar hasta fin de mes. Incluye lo atrasado de meses anteriores
// (sigue debiéndose) y excluye lo que no tiene fecha o vence después: no se
// puede contar con plata que no se sabe cuándo llega.
export function calcularProyeccion(saldoCentimos: number, previstos: PrevistoPanel[], finDeMes: string): Proyeccion {
  const queCuentan = previstos.filter(
    (p) => estaAbierto(p) && p.fechaEsperada !== null && p.fechaEsperada <= finDeMes,
  );
  const porCobrarCentimos = sumarRestante(queCuentan.filter((p) => p.tipo === "ingreso"));
  const porPagarCentimos = sumarRestante(queCuentan.filter((p) => p.tipo === "egreso"));

  return {
    saldoCentimos,
    porCobrarCentimos,
    porPagarCentimos,
    cierreCentimos: saldoCentimos + porCobrarCentimos - porPagarCentimos,
  };
}

function sumarRestante(previstos: PrevistoPanel[]): number {
  return previstos.reduce((suma, p) => suma + restanteCentimos(p), 0);
}
