import { convertirNumerosEnPalabras } from "../ingreso/convertir-numeros-en-palabras.ts";
import { extraerMonto } from "../ingreso/extraer-monto.ts";
import { formatearNombre } from "../texto/nombres.ts";
import { normalizarParaComparar } from "../texto/normalizar.ts";

export type PrestamoNuevo = {
  persona: string;
  montoCentimos: number;
  devolucionCentimos: number;
  fecha: string;
  fechaDevolucion: string;
};

export type ResultadoPrestamo = { ok: true; prestamo: PrestamoNuevo } | { ok: false; error: string };

const LARGO_MAXIMO_PERSONA = 60;
const PALABRA_PRESTAMO = "prestamo";
// Lo que se suele decir antes del nombre: "le presté a Gaby", "a Gaby", "para Gaby".
const RELLENO_INICIAL = /^(?:(?:le|les)\s+)?(?:prest[eé]\s+)?(?:a|para)\s+/iu;
const NOMBRE_VALIDO = /^[\p{L}][\p{L}\s'.-]*$/u;

// Respuesta a "¿a quién y cuánto?": "Gaby 120", "a Gaby ciento veinte".
export function leerPersonaYMonto(texto: string): { persona: string; montoCentimos: number } | null {
  const monto = extraerMonto(convertirNumerosEnPalabras(texto.trim()));
  if (!monto || monto.moneda !== "PEN") return null;

  const persona = monto.textoRestante.replace(/\s+/g, " ").trim().replace(RELLENO_INICIAL, "");
  return persona ? { persona, montoCentimos: monto.montoCentimos } : null;
}

export function validarPrestamo(datos: PrestamoNuevo, hoy: string): ResultadoPrestamo {
  const persona = datos.persona.trim();
  if (!persona || persona.length > LARGO_MAXIMO_PERSONA || !NOMBRE_VALIDO.test(persona)) {
    return { ok: false, error: "Escribe a quién le prestas, solo el nombre." };
  }
  if (datos.montoCentimos <= 0 || datos.devolucionCentimos <= 0) {
    return { ok: false, error: "Los montos deben ser mayores a cero." };
  }
  if (datos.fechaDevolucion < hoy) {
    return { ok: false, error: "La fecha de devolución debe ser hoy o después." };
  }

  return { ok: true, prestamo: { ...datos, persona: formatearNombre(persona) ?? persona } };
}

// Palabras con que se reconoce la devolución al dictarla: el nombre y
// "préstamo". "gaby me pagó 130" la encuentra; "gaby me pagó disney" no,
// porque Disney de Gaby es más específico (ver elegirPrevisto).
export function patronesDeDevolucion(persona: string): string[] {
  return [normalizarParaComparar(persona), PALABRA_PRESTAMO];
}
