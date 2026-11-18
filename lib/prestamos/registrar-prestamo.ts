import { diaYMes } from "../fechas/formato.ts";
import { formatearMonto } from "../movimientos/formato-monto.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import { patronesDeDevolucion, type PrestamoNuevo } from "./prestamo.ts";

// Recibe un préstamo ya validado. textoOriginal queda como fuente, igual que
// lo dictado en un movimiento común.
export async function registrarPrestamo(prestamo: PrestamoNuevo, textoOriginal: string): Promise<string> {
  const { error } = await crearClienteServidor().rpc("registrar_prestamo", {
    p_texto: textoOriginal,
    p_persona: prestamo.persona,
    p_monto_centimos: prestamo.montoCentimos,
    p_devolucion_centimos: prestamo.devolucionCentimos,
    p_fecha: prestamo.fecha,
    p_fecha_devolucion: prestamo.fechaDevolucion,
    p_patrones: patronesDeDevolucion(prestamo.persona),
  });
  if (error) throw new Error(`No se pudo registrar el préstamo: ${error.message}`);

  return mensajeDePrestamo(prestamo);
}

export function mensajeDePrestamo(prestamo: PrestamoNuevo): string {
  const ganancia = prestamo.devolucionCentimos - prestamo.montoCentimos;
  const detalleGanancia = ganancia > 0 ? ` (ganas ${formatearMonto(ganancia, "PEN")})` : "";
  return (
    `Préstamo a ${prestamo.persona} · ${formatearMonto(prestamo.montoCentimos, "PEN")} · ` +
    `te devuelve ${formatearMonto(prestamo.devolucionCentimos, "PEN")} el ${diaYMes(prestamo.fechaDevolucion)}${detalleGanancia}`
  );
}
