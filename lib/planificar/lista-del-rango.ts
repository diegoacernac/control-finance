import { inicioDeMes } from "../fechas/lima.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { estaAbierto, restanteCentimos } from "./proyectar-meses.ts";
import type { RangoPlan } from "./rango.ts";
import type { PrevistoPlan } from "./tipos.ts";

export type GrupoDelMes = { mes: string; previstos: PrevistoPlan[] };

export type TotalCategoria = { nombre: string; tipo: TipoMovimiento; totalCentimos: number };

// Lo abierto y lo omitido del rango (lo omitido, para poder reabrirlo), con el
// filtro de tipo, agrupado por mes.
export function previstosDelRango(previstos: PrevistoPlan[], rango: RangoPlan): GrupoDelMes[] {
  const delRango = previstos
    .filter((p) => p.fechaEsperada !== null && p.fechaEsperada >= rango.desde && p.fechaEsperada <= rango.hasta)
    .filter((p) => estaAbierto(p) || p.estado === "omitido")
    .filter((p) => rango.tipo === "todo" || p.tipo === rango.tipo)
    .sort(porFecha);

  const grupos: GrupoDelMes[] = [];
  for (const previsto of delRango) {
    const mes = inicioDeMes(previsto.fechaEsperada!);
    const ultimo = grupos.at(-1);
    if (ultimo?.mes === mes) ultimo.previstos.push(previsto);
    else grupos.push({ mes, previstos: [previsto] });
  }
  return grupos;
}

// Por categoría raíz ("Mascota › Comida" suma en Mascota), lo que falta de lo abierto.
export function totalesPorCategoria(grupos: GrupoDelMes[]): TotalCategoria[] {
  const totales = new Map<string, TotalCategoria>();
  for (const previsto of grupos.flatMap((g) => g.previstos).filter(estaAbierto)) {
    const nombre = previsto.categoriaNombre.split(" › ")[0];
    const clave = `${previsto.tipo}:${nombre}`;
    const actual = totales.get(clave) ?? { nombre, tipo: previsto.tipo, totalCentimos: 0 };
    actual.totalCentimos += restanteCentimos(previsto);
    totales.set(clave, actual);
  }
  return [...totales.values()].sort((a, b) => b.totalCentimos - a.totalCentimos);
}

// La última cuota de cada préstamo o compra en cuotas: desde el mes siguiente
// ese pago deja de salir.
export function cuotasQueTerminan(previstos: PrevistoPlan[], hoy: string, hasta: string): PrevistoPlan[] {
  return previstos
    .filter((p) => p.numeroCuota !== null && p.numeroCuota === p.cuotasTotal && p.estado !== "omitido")
    .filter((p) => p.fechaEsperada !== null && p.fechaEsperada >= inicioDeMes(hoy) && p.fechaEsperada <= hasta)
    .sort(porFecha);
}

export function planeadosPendientes(previstos: PrevistoPlan[]): PrevistoPlan[] {
  return previstos.filter((p) => p.planeado && estaAbierto(p)).sort(porFecha);
}

function porFecha(a: PrevistoPlan, b: PrevistoPlan): number {
  const fechaA = a.fechaEsperada ?? "";
  const fechaB = b.fechaEsperada ?? "";
  if (fechaA === fechaB) return a.id - b.id;
  return fechaA < fechaB ? -1 : 1;
}
