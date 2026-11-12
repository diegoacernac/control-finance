import type { MovimientoPanel } from "./tipos.ts";

export type GastoCategoria = { nombre: string; centimos: number; porcentaje: number };

export type GastoDelMes = { totalCentimos: number; categorias: GastoCategoria[] };

const SIN_CATEGORIA = "Sin categoría";
const PORCENTAJE_TOTAL = 100;

// Solo egresos en soles: sumar dólares como si fueran soles daría un total
// falso. Las subcategorías se agrupan en su categoría padre.
export function calcularGastoDelMes(movimientos: MovimientoPanel[]): GastoDelMes {
  const egresos = movimientos.filter((m) => m.tipo === "egreso" && m.moneda === "PEN");
  const totalCentimos = egresos.reduce((suma, m) => suma + m.montoCentimos, 0);

  const porCategoria = new Map<string, number>();
  for (const egreso of egresos) {
    const nombre = egreso.categoriaRaiz ?? SIN_CATEGORIA;
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + egreso.montoCentimos);
  }

  const categorias = [...porCategoria]
    .map(([nombre, centimos]) => ({
      nombre,
      centimos,
      porcentaje: Math.round((centimos / totalCentimos) * PORCENTAJE_TOTAL),
    }))
    .sort((a, b) => b.centimos - a.centimos);

  return { totalCentimos, categorias };
}
