import { construirFechaIso, esFechaIsoValida, finDeMes, sumarDias } from "../fechas/lima.ts";
import { convertirNumerosEnPalabras } from "../ingreso/convertir-numeros-en-palabras.ts";

// Para "¿cuándo te devuelve?": a diferencia de la fecha de un gasto, mira hacia
// adelante. "el 10" dicho el 18 es el 10 del mes siguiente.

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const DIAS_DESDE_HOY: Record<string, number> = { hoy: 0, manana: 1, "pasado manana": 2 };

const PATRON_NUMERICO = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
const PATRON_DIA_Y_MES = /^(?:el\s+)?(\d{1,2})(?:\s+de\s+([a-z]+))?(?:\s+del?\s+(\d{4}))?$/;
const FIN_DE_MES = /^(?:a\s+)?fin(?:es)?\s+de\s+mes$/;

export function leerFechaFutura(texto: string, hoy: string): string | null {
  const limpio = normalizar(convertirNumerosEnPalabras(texto));
  if (esFechaIsoValida(limpio)) return limpio;
  if (limpio in DIAS_DESDE_HOY) return sumarDias(hoy, DIAS_DESDE_HOY[limpio]);
  if (FIN_DE_MES.test(limpio)) return finDeMes(hoy);

  const numerica = limpio.match(PATRON_NUMERICO);
  if (numerica) return proximaFecha(hoy, Number(numerica[1]), Number(numerica[2]), numerica[3]);

  const diaYMes = limpio.match(PATRON_DIA_Y_MES);
  if (!diaYMes) return null;

  const dia = Number(diaYMes[1]);
  if (!diaYMes[2]) return proximoDiaDelMes(hoy, dia);

  const mes = MESES[diaYMes[2]];
  return mes ? proximaFecha(hoy, dia, mes, diaYMes[3]) : null;
}

// Sin año: este año, o el siguiente si esa fecha ya pasó.
function proximaFecha(hoy: string, dia: number, mes: number, anioTexto: string | undefined): string | null {
  if (anioTexto) return construirFechaIso(Number(anioTexto), mes, dia);

  const anioHoy = Number(hoy.slice(0, 4));
  const esteAnio = construirFechaIso(anioHoy, mes, dia);
  if (esteAnio === null) return null;
  return esteAnio >= hoy ? esteAnio : construirFechaIso(anioHoy + 1, mes, dia);
}

function proximoDiaDelMes(hoy: string, dia: number): string | null {
  const [anio, mes] = hoy.split("-").map(Number);
  const esteMes = construirFechaIso(anio, mes, dia);
  if (esteMes !== null && esteMes >= hoy) return esteMes;
  return mes === 12 ? construirFechaIso(anio + 1, 1, dia) : construirFechaIso(anio, mes + 1, dia);
}

// Quita tildes, mayúsculas y puntuación final, pero conserva "/" y "-" de las fechas.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.,;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
