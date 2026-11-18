import { sumarDias } from "../fechas/lima.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { contieneFrase, normalizarParaComparar } from "../texto/normalizar.ts";

export type PrevistoAbierto = {
  id: number;
  fijoId: number | null;
  nombre: string;
  tipo: TipoMovimiento;
  categoriaId: number;
  categoriaNombre: string;
  persona: string | null;
  patrones: string[];
  fechaEsperada: string | null;
};

export type EleccionPrevisto =
  | { resultado: "ninguno" }
  | { resultado: "elegido"; previsto: PrevistoAbierto }
  | { resultado: "ambiguo"; nombres: string[] };

// Permite registrar un pago unos días antes de su fecha (HBO el 15 para el 17).
export const DIAS_DE_ANTICIPACION = 10;

export function elegirPrevisto(
  descripcion: string,
  tipo: TipoMovimiento,
  fecha: string,
  previstos: PrevistoAbierto[],
): EleccionPrevisto {
  const limite = sumarDias(fecha, DIAS_DE_ANTICIPACION);
  const porPatron = previstos.filter(
    (p) => p.tipo === tipo && dentroDeVentana(p, limite) && coincidePatron(p, descripcion),
  );
  if (porPatron.length === 0) return { resultado: "ninguno" };

  // "disney 15" sin decir quién pagó: la palabra coincide pero ninguna persona,
  // así que se pregunta en vez de adivinar.
  const conPersona = porPatron.filter((p) => coincidePersona(p, descripcion));
  if (conPersona.length === 0) return ambiguo(porPatron);

  // "gaby me pagó disney 15": coinciden la Disney de Gaby (por "disney") y su
  // préstamo (solo por el nombre). Gana el que coincide por algo más que el nombre.
  const especificos = conPersona.filter((p) => !coincideSoloPorPersona(p, descripcion));
  const candidatos = especificos.length > 0 ? especificos : conPersona;

  // Varios previstos del mismo fijo (sueldo de noviembre parcial y el de
  // diciembre) no son ambigüedad: se salda el más antiguo. Varios fijos
  // distintos sí lo son.
  const origenes = new Set(candidatos.map((p) => p.fijoId ?? `unico-${p.id}`));
  if (origenes.size > 1) return ambiguo(candidatos);

  return { resultado: "elegido", previsto: candidatos.sort(porFechaMasAntigua)[0] };
}

function ambiguo(previstos: PrevistoAbierto[]): EleccionPrevisto {
  return { resultado: "ambiguo", nombres: [...new Set(previstos.map(nombreVisible))] };
}

// La ventana evita tomar el pago de este mes como el del mes siguiente de un
// fijo. Un previsto único (un préstamo) no se repite: si te devuelven antes, cuenta.
function dentroDeVentana(previsto: PrevistoAbierto, limite: string): boolean {
  if (previsto.fijoId === null || previsto.fechaEsperada === null) return true;
  return previsto.fechaEsperada <= limite;
}

function coincidePatron(previsto: PrevistoAbierto, descripcion: string): boolean {
  return previsto.patrones.some((patron) => contieneFrase(descripcion, patron));
}

function coincideSoloPorPersona(previsto: PrevistoAbierto, descripcion: string): boolean {
  if (previsto.persona === null) return false;
  const persona = normalizarParaComparar(previsto.persona);
  return previsto.patrones
    .filter((patron) => contieneFrase(descripcion, patron))
    .every((patron) => normalizarParaComparar(patron) === persona);
}

function coincidePersona(previsto: PrevistoAbierto, descripcion: string): boolean {
  return previsto.persona === null || contieneFrase(descripcion, previsto.persona);
}

function nombreVisible(previsto: PrevistoAbierto): string {
  return previsto.persona ? `${previsto.nombre} (${previsto.persona})` : previsto.nombre;
}

// Los previstos sin fecha van al final: primero se saldan los que tienen fecha.
function porFechaMasAntigua(a: PrevistoAbierto, b: PrevistoAbierto): number {
  if (a.fechaEsperada === b.fechaEsperada) return a.id - b.id;
  if (a.fechaEsperada === null) return 1;
  if (b.fechaEsperada === null) return -1;
  return a.fechaEsperada < b.fechaEsperada ? -1 : 1;
}
