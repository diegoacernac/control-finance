import type { TipoMovimiento } from "../movimientos/tipos.ts";

type SenalesDeTipo = { tipoExplicito: TipoMovimiento | null; persona: string | null; textoRestante: string };

const MARCA_INGRESO_INICIAL = /^\s*\+\s*/;
const FRASE_INGRESO_CON_PERSONA =
  /^\s*(?<persona>[\p{L}\s]*?)\s*(?<!\p{L})me\s+(?:pag[oó]|yape[oó]|plin[eé][oó]|transfiri[oó]|devolvi[oó])(?!\p{L})/iu;
const PALABRA_INGRESO = /(?<!\p{L})(?:cobr[eé]|recib[ií])(?!\p{L})/iu;

// Sin señal explícita el tipo queda en null y lo decide la regla que coincida
// ("sueldo" es ingreso por su categoría); si tampoco hay regla, es egreso.
export function detectarSenalesDeTipo(texto: string): SenalesDeTipo {
  const textoRestante = texto.replace(MARCA_INGRESO_INICIAL, "");
  const tieneMarcaMas = textoRestante !== texto;

  const frase = textoRestante.match(FRASE_INGRESO_CON_PERSONA);
  if (frase) {
    return { tipoExplicito: "ingreso", persona: formatearPersona(frase.groups?.persona), textoRestante };
  }

  const esIngreso = tieneMarcaMas || PALABRA_INGRESO.test(textoRestante);
  return { tipoExplicito: esIngreso ? "ingreso" : null, persona: null, textoRestante };
}

function formatearPersona(nombre: string | undefined): string | null {
  const palabras = nombre?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (palabras.length === 0) return null;
  return palabras.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}
