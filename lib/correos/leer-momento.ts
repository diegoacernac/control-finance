import { construirFechaIso } from "../fechas/lima.ts";

export type Momento = { fecha: string; ocurridoEn: string | null };

// Interbank escribe los meses abreviados en español ("Ago", "Set"); se aceptan
// también los ingleses por si alguna plantilla los usa ("Aug", "Dec").
const MESES: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const FECHA_CON_MES_EN_LETRAS = /(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/;
const FECHA_NUMERICA = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
// "11:05 PM", "9:35 pm", "01:02 p. m."
const HORA = /(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\b/;
const MARCAS_DIACRITICAS = /\p{M}/gu;

// Lima no tiene horario de verano: siempre UTC−5.
const DESFASE_LIMA = "-05:00";
const HORAS_MEDIO_DIA = 12;

// "20 Oct 2026 11:05 PM", "02 Oct 2026 9:35 PM" o "25/10/2026 01:02 PM".
// Sin hora reconocible, queda solo la fecha.
export function leerMomento(texto: string): Momento | null {
  const base = texto.normalize("NFD").replace(MARCAS_DIACRITICAS, "").toLowerCase();
  const fecha = leerFecha(base);
  if (!fecha) return null;

  const hora = leerHora(base);
  return { fecha, ocurridoEn: hora ? `${fecha}T${hora}:00${DESFASE_LIMA}` : null };
}

function leerFecha(base: string): string | null {
  const numerica = base.match(FECHA_NUMERICA);
  if (numerica) return construirFechaIso(Number(numerica[3]), Number(numerica[2]), Number(numerica[1]));

  const enLetras = base.match(FECHA_CON_MES_EN_LETRAS);
  const mes = enLetras ? MESES[enLetras[2]] : undefined;
  if (!enLetras || !mes) return null;
  return construirFechaIso(Number(enLetras[3]), mes, Number(enLetras[1]));
}

function leerHora(base: string): string | null {
  const coincidencia = base.match(HORA);
  if (!coincidencia) return null;

  const horaDoce = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);
  if (horaDoce < 1 || horaDoce > HORAS_MEDIO_DIA || minutos > 59) return null;

  const esTarde = coincidencia[3] === "p";
  const hora24 = (horaDoce % HORAS_MEDIO_DIA) + (esTarde ? HORAS_MEDIO_DIA : 0);
  return `${String(hora24).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}
