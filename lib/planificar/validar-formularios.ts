import { esFechaIsoValida } from "../fechas/lima.ts";
import { leerMontoExacto } from "../ingreso/leer-monto-exacto.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { normalizarParaComparar } from "../texto/normalizar.ts";
import { limiteDelHorizonte } from "./rango.ts";

export type PlaneadoNuevo = {
  nombre: string;
  tipo: TipoMovimiento;
  categoriaId: number;
  montoCentimos: number;
  fecha: string;
  patrones: string[];
};

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

type CamposPlaneado = { nombre: string; tipo: string; categoriaId: string; monto: string; fecha: string };

const LARGO_MAXIMO_NOMBRE = 60;
const DIA_MAXIMO = 31;

// "Viaje Cusco", S/ 1500, 15 de febrero. Se reconoce después por su nombre
// completo: "viaje cusco pasajes 800" se asocia; "taxi cusco" no.
export function validarPlaneado(campos: CamposPlaneado, hoy: string): Resultado<PlaneadoNuevo> {
  const nombre = campos.nombre.replace(/\s+/g, " ").trim();
  const patron = normalizarParaComparar(nombre);
  if (!patron || nombre.length > LARGO_MAXIMO_NOMBRE) {
    return { ok: false, error: `Escribe un nombre de hasta ${LARGO_MAXIMO_NOMBRE} caracteres.` };
  }
  if (campos.tipo !== "ingreso" && campos.tipo !== "egreso") return { ok: false, error: "Elige si es gasto o ingreso." };

  const categoriaId = Number(campos.categoriaId);
  if (!Number.isSafeInteger(categoriaId) || categoriaId <= 0) return { ok: false, error: "Elige una categoría." };

  const montoCentimos = leerMontoExacto(campos.monto);
  if (montoCentimos === null) return { ok: false, error: "Escribe solo el monto, por ejemplo 1500." };

  if (!esFechaIsoValida(campos.fecha) || campos.fecha < hoy || campos.fecha > limiteDelHorizonte(hoy)) {
    return { ok: false, error: "Elige una fecha desde hoy y dentro de los próximos 12 meses." };
  }

  return {
    ok: true,
    valor: { nombre, tipo: campos.tipo, categoriaId, montoCentimos, fecha: campos.fecha, patrones: [patron] },
  };
}

// Para el ahorro y el gasto variable, 0 es válido: "dejar de ahorrar".
export function leerMontoOCero(texto: string): number | null {
  return /^0+(?:[.,]0+)?$/.test(texto.trim()) ? 0 : leerMontoExacto(texto);
}

export function leerDiaDelMes(texto: string): number | null {
  const dia = Number(texto);
  return Number.isInteger(dia) && dia >= 1 && dia <= DIA_MAXIMO ? dia : null;
}
