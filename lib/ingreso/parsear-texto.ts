import type { Moneda, TipoMovimiento } from "../movimientos/tipos.ts";
import { convertirNumerosEnPalabras } from "./convertir-numeros-en-palabras.ts";
import { detectarSenalesDeTipo } from "./detectar-senales-de-tipo.ts";
import { extraerFecha } from "./extraer-fecha.ts";
import { extraerMonto } from "./extraer-monto.ts";

export type MovimientoParseado = {
  tipoExplicito: TipoMovimiento | null;
  montoCentimos: number;
  moneda: Moneda;
  fecha: string;
  descripcion: string;
  persona: string | null;
};

export type ResultadoParseo = { ok: true; movimiento: MovimientoParseado } | { ok: false; error: string };

const EJEMPLO = 'Ejemplo: "taxi oficina 12.50"';
const BORDES_SIN_CONTENIDO = /^[\s\p{P}]+|[\s\p{P}]+$/gu;

// El orden importa: los números dictados en letras pasan a dígitos primero; la
// fecha sale antes que el monto para que "10/11" no se lea como monto, y el "+"
// inicial antes del monto para que "+4500" no lo arrastre.
export function parsearTexto(texto: string, hoy: string): ResultadoParseo {
  const { fecha, textoRestante: sinFecha } = extraerFecha(convertirNumerosEnPalabras(texto), hoy);
  const senales = detectarSenalesDeTipo(sinFecha);

  const monto = extraerMonto(senales.textoRestante);
  if (!monto) return { ok: false, error: `No encontré el monto. ${EJEMPLO}` };

  const descripcion = limpiarDescripcion(monto.textoRestante);
  if (!descripcion) return { ok: false, error: `Falta la descripción. ${EJEMPLO}` };

  return {
    ok: true,
    movimiento: {
      tipoExplicito: senales.tipoExplicito,
      montoCentimos: monto.montoCentimos,
      moneda: monto.moneda,
      fecha,
      descripcion,
      persona: senales.persona,
    },
  };
}

function limpiarDescripcion(texto: string): string {
  return texto.replace(/\s+/g, " ").replace(BORDES_SIN_CONTENIDO, "");
}
