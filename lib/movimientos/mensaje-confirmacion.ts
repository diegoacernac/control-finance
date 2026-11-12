import { formatearMonto } from "./formato-monto.ts";
import type { MovimientoRegistrado } from "./registrar-movimiento-manual.ts";

// Texto corto que el atajo de iOS muestra como notificación.
export function mensajeDeConfirmacion(movimiento: MovimientoRegistrado): string {
  const categoria = movimiento.categoria ?? "Sin categoría (por revisar)";
  const monto = formatearMonto(movimiento.montoCentimos, movimiento.moneda);
  const etiquetaTotal = movimiento.tipo === "ingreso" ? "ingresos del mes" : "gastos del mes";
  const total = formatearMonto(movimiento.totalMesCentimos, movimiento.moneda);

  const partes = [categoria, monto, describirPrevisto(movimiento), `${etiquetaTotal}: ${total}`];
  return partes.filter(Boolean).join(" · ");
}

function describirPrevisto(movimiento: MovimientoRegistrado): string | null {
  if (movimiento.previstosPosibles.length > 0) {
    return `¿cuál? ${movimiento.previstosPosibles.join(", ")} (por revisar)`;
  }

  const { previsto } = movimiento;
  if (!previsto) return null;
  if (previsto.estado !== "parcial") return `${previsto.nombre}: ${previsto.estado}`;

  const faltante = formatearMonto(previsto.restanteCentimos, movimiento.moneda);
  return `${previsto.nombre}: parcial, faltan ${faltante}`;
}
