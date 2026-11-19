import type { EstadoPrevisto } from "../movimientos/registrar-movimiento-manual.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";

// Nombre de la categoría que crea la migración de planificación.
export const CATEGORIA_AHORRO = "Ahorro";

export type PrevistoPlan = {
  id: number;
  fijoId: number | null;
  nombre: string;
  tipo: TipoMovimiento;
  categoriaNombre: string;
  persona: string | null;
  fechaEsperada: string | null;
  numeroCuota: number | null;
  cuotasTotal: number | null;
  estado: EstadoPrevisto;
  montoEsperadoCentimos: number;
  pagadoCentimos: number;
  planeado: boolean;
};

export type FiltroTipo = "todo" | TipoMovimiento;

export function esAhorro(previsto: PrevistoPlan): boolean {
  return previsto.tipo === "egreso" && previsto.categoriaNombre === CATEGORIA_AHORRO;
}
