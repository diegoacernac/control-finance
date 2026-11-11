import type { MovimientoRegistrado } from "./registrar-movimiento-manual.ts";
import type { Moneda } from "./tipos.ts";

export function formatearMonto(centimos: number, moneda: Moneda): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(centimos / 100);
}

// Texto corto que el atajo de iOS muestra como notificación.
export function mensajeDeConfirmacion(movimiento: MovimientoRegistrado): string {
  const categoria = movimiento.categoria ?? "Sin categoría (por revisar)";
  const monto = formatearMonto(movimiento.montoCentimos, movimiento.moneda);
  const etiquetaTotal = movimiento.tipo === "ingreso" ? "ingresos del mes" : "gastos del mes";
  const total = formatearMonto(movimiento.totalMesCentimos, movimiento.moneda);
  return `${categoria} · ${monto} · ${etiquetaTotal}: ${total}`;
}
