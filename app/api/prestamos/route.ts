import { tokenApiValido } from "@/lib/auth/token-api.ts";
import { fechaEnLima } from "@/lib/fechas/lima.ts";
import { campoDeTexto, leerCuerpoJson } from "@/lib/http/cuerpo-json.ts";
import { leerMontoExacto } from "@/lib/ingreso/leer-monto-exacto.ts";
import { leerFechaFutura } from "@/lib/prestamos/leer-fecha-futura.ts";
import { leerPersonaYMonto, validarPrestamo } from "@/lib/prestamos/prestamo.ts";
import { registrarPrestamo } from "@/lib/prestamos/registrar-prestamo.ts";

// Las tres respuestas del atajo, tal cual se dictaron:
// {"quien": "Gaby 120", "devolucion": "130", "cuando": "2 de diciembre"}.
export async function POST(request: Request) {
  if (!tokenApiValido(request.headers.get("authorization"))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const cuerpo = await leerCuerpoJson(request);
  const quien = cuerpo ? campoDeTexto(cuerpo, "quien") : null;
  const devolucion = cuerpo ? campoDeTexto(cuerpo, "devolucion") : null;
  const cuando = cuerpo ? campoDeTexto(cuerpo, "cuando") : null;
  if (quien === null || devolucion === null || cuando === null) {
    return Response.json({ error: 'Envía un JSON {"quien": "...", "devolucion": "...", "cuando": "..."}' }, { status: 400 });
  }

  const hoy = fechaEnLima(new Date());
  const personaYMonto = leerPersonaYMonto(quien);
  if (!personaYMonto) return error422(`No entendí a quién ni cuánto. Ejemplo: "Gaby 120". Recibí: "${quien}"`);

  const devolucionCentimos = leerMontoExacto(devolucion);
  if (devolucionCentimos === null) return error422(`No entendí cuánto te devuelve. Ejemplo: "130". Recibí: "${devolucion}"`);

  const fechaDevolucion = leerFechaFutura(cuando, hoy);
  if (fechaDevolucion === null) return error422(`No entendí cuándo. Ejemplo: "el 25" o "2 de diciembre". Recibí: "${cuando}"`);

  const validacion = validarPrestamo({ ...personaYMonto, devolucionCentimos, fecha: hoy, fechaDevolucion }, hoy);
  if (!validacion.ok) return error422(validacion.error);

  const mensaje = await registrarPrestamo(validacion.prestamo, `${quien} · devuelve ${devolucion} · ${cuando}`);
  return Response.json({ mensaje }, { status: 201 });
}

function error422(mensaje: string): Response {
  return Response.json({ error: mensaje }, { status: 422 });
}
