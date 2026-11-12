import { inicioDeMes } from "../fechas/lima.ts";
import { estaAbierto } from "./proyeccion.ts";
import type { PrevistoPanel } from "./tipos.ts";

export type PrevistosAgrupados = {
  atrasados: PrevistoPanel[];
  proximos: PrevistoPanel[];
  sinFecha: PrevistoPanel[];
  masAdelante: PrevistoPanel[];
  resueltos: PrevistoPanel[];
};

// Reparte los previstos en las secciones de la lista. Los resueltos son solo
// los del mes en curso; los abiertos se muestran todos, vengan de cuando vengan.
export function agruparPrevistos(previstos: PrevistoPanel[], hoy: string, finDeMes: string): PrevistosAgrupados {
  const abiertos = previstos.filter(estaAbierto).sort(porFecha);
  const conFecha = abiertos.filter((p) => p.fechaEsperada !== null);
  const inicio = inicioDeMes(hoy);

  return {
    atrasados: conFecha.filter((p) => p.fechaEsperada! < hoy),
    proximos: conFecha.filter((p) => p.fechaEsperada! >= hoy && p.fechaEsperada! <= finDeMes),
    sinFecha: abiertos.filter((p) => p.fechaEsperada === null),
    masAdelante: conFecha.filter((p) => p.fechaEsperada! > finDeMes),
    resueltos: previstos
      .filter((p) => !estaAbierto(p) && p.fechaEsperada !== null && p.fechaEsperada >= inicio && p.fechaEsperada <= finDeMes)
      .sort(porFecha),
  };
}

function porFecha(a: PrevistoPanel, b: PrevistoPanel): number {
  const fechaA = a.fechaEsperada ?? "";
  const fechaB = b.fechaEsperada ?? "";
  if (fechaA === fechaB) return a.id - b.id;
  return fechaA < fechaB ? -1 : 1;
}
