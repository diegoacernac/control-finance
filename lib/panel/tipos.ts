import type { EstadoPrevisto } from "../movimientos/registrar-movimiento-manual.ts";
import type { Moneda, TipoMovimiento } from "../movimientos/tipos.ts";

export type PrevistoPanel = {
  id: number;
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
};

export type MovimientoPanel = {
  id: number;
  tipo: TipoMovimiento;
  montoCentimos: number;
  moneda: Moneda;
  fecha: string;
  descripcion: string;
  categoriaNombre: string | null;
  categoriaRaiz: string | null;
  previstoNombre: string | null;
};

export type SaldoCuenta = { id: number; nombre: string; saldoCentimos: number };

export type OpcionCategoria = { id: number; tipo: TipoMovimiento; nombre: string };
