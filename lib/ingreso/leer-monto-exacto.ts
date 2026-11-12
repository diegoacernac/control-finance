import { convertirNumerosEnPalabras } from "./convertir-numeros-en-palabras.ts";
import { extraerMonto } from "./extraer-monto.ts";

// Para el campo "monto" al editar: acepta "12.50", "12,50", "S/ 12" o "doce",
// pero nada más que el monto. "taxi 12" no es un monto.
export function leerMontoExacto(texto: string): number | null {
  const monto = extraerMonto(convertirNumerosEnPalabras(texto.trim()));
  if (!monto || monto.textoRestante.trim() !== "") return null;
  return monto.montoCentimos;
}
