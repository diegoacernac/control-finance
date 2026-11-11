import type { Moneda } from "../movimientos/tipos.ts";

type MontoExtraido = { montoCentimos: number; moneda: Moneda; textoRestante: string };

const LIMITE_INTEGER_POSTGRES = 2_147_483_647;

// Acepta "12.50", "12,50", "1,250.00", "1.250,50", con "S/", "S/.", "$", "US$",
// "USD" delante o "soles"/"dólares" detrás.
const PATRON_MONTO =
  /(?<![\p{L}\d.,])(?<prefijo>s\/\.?|us\$|\$|usd)?\s?(?<numero>\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s?(?<sufijo>soles|sol|d[oó]lares|usd))?(?![\p{L}\d])/giu;

const DECIMALES_FINALES = /[.,](\d{1,2})$/;

export function extraerMonto(texto: string): MontoExtraido | null {
  const coincidencia = elegirCoincidencia([...texto.matchAll(PATRON_MONTO)]);
  if (!coincidencia?.groups) return null;

  const montoCentimos = convertirACentimos(coincidencia.groups.numero);
  if (montoCentimos === null) return null;

  const inicio = coincidencia.index ?? 0;
  return {
    montoCentimos,
    moneda: detectarMoneda(coincidencia.groups.prefijo ?? coincidencia.groups.sufijo),
    textoRestante: `${texto.slice(0, inicio)} ${texto.slice(inicio + coincidencia[0].length)}`,
  };
}

// Si hay varios números ("menú 2 personas 36"), gana el que tiene moneda;
// si ninguno la tiene, el último, que es donde se suele dictar el monto.
function elegirCoincidencia(coincidencias: RegExpMatchArray[]): RegExpMatchArray | undefined {
  const conMoneda = coincidencias.findLast((c) => c.groups?.prefijo || c.groups?.sufijo);
  return conMoneda ?? coincidencias.at(-1);
}

// El último separador seguido de 1–2 dígitos es decimal; seguido de 3, es de miles.
function convertirACentimos(numero: string): number | null {
  const decimales = numero.match(DECIMALES_FINALES);
  const parteEntera = decimales ? numero.slice(0, decimales.index) : numero;
  const centavos = decimales ? decimales[1].padEnd(2, "0") : "00";

  const centimos = Number(parteEntera.replace(/[.,]/g, "")) * 100 + Number(centavos);
  if (centimos <= 0 || centimos > LIMITE_INTEGER_POSTGRES) return null;
  return centimos;
}

function detectarMoneda(marca: string | undefined): Moneda {
  const marcaMinuscula = marca?.toLowerCase() ?? "";
  const esDolar = marcaMinuscula.includes("$") || marcaMinuscula.includes("usd") || marcaMinuscula.startsWith("d");
  return esDolar ? "USD" : "PEN";
}
