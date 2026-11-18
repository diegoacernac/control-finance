import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { formatearNombre } from "../texto/nombres.ts";

type SenalesDeTipo = { tipoExplicito: TipoMovimiento | null; persona: string | null; textoRestante: string };

const MARCA_INGRESO_INICIAL = /^\s*\+\s*/;

// Singular y plural: "me pagó" / "me pagaron", "me yapeó" / "me yapearon"…
const VERBOS_DE_COBRO =
  "pag(?:[oó]|aron)|yape(?:[oó]|aron)|plin(?:e[oó]|earon)|transfiri(?:[oó]|eron)|devolvi(?:[oó]|eron)|deposit(?:[oó]|aron)|envi(?:[oó]|aron)|abon(?:[oó]|aron)";
const FRASE_INGRESO_CON_PERSONA = new RegExp(
  `^\\s*(?<persona>[\\p{L}\\s]*?)\\s*(?<!\\p{L})me\\s+(?:${VERBOS_DE_COBRO})(?!\\p{L})`,
  "iu",
);
const PALABRA_INGRESO = /(?<!\p{L})(?:cobr[eé]|recib[ií])(?!\p{L})/iu;

// Sin señal explícita el tipo queda en null y lo decide la regla que coincida
// ("sueldo" es ingreso por su categoría); si tampoco hay regla, es egreso.
export function detectarSenalesDeTipo(texto: string): SenalesDeTipo {
  const textoRestante = texto.replace(MARCA_INGRESO_INICIAL, "");
  const tieneMarcaMas = textoRestante !== texto;

  const frase = textoRestante.match(FRASE_INGRESO_CON_PERSONA);
  if (frase) {
    return { tipoExplicito: "ingreso", persona: formatearNombre(frase.groups?.persona), textoRestante };
  }

  const esIngreso = tieneMarcaMas || PALABRA_INGRESO.test(textoRestante);
  return { tipoExplicito: esIngreso ? "ingreso" : null, persona: null, textoRestante };
}
