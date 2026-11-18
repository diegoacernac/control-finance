import { tokenApiValido } from "@/lib/auth/token-api.ts";
import { campoDeTexto, leerCuerpoJson } from "@/lib/http/cuerpo-json.ts";
import { LARGO_MAXIMO_TEXTO } from "@/lib/movimientos/limites.ts";
import { mensajeDeConfirmacion } from "@/lib/movimientos/mensaje-confirmacion.ts";
import { registrarMovimientoManual } from "@/lib/movimientos/registrar-movimiento-manual.ts";
import { leerTipoElegido } from "@/lib/movimientos/tipo-elegido.ts";

// Cuerpo: {"texto": "taxi 12.50"} y, opcional, "tipo": "pago" | "cobro".
export async function POST(request: Request) {
  if (!tokenApiValido(request.headers.get("authorization"))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const cuerpo = await leerCuerpoJson(request);
  const texto = cuerpo ? campoDeTexto(cuerpo, "texto") : null;
  const tipoElegido = leerTipoElegido(cuerpo?.tipo);
  if (!cuerpo || texto === null || !tipoElegido.valido) {
    return Response.json(
      { error: `Envía un JSON {"texto": "...", "tipo": "pago" o "cobro"} con texto de hasta ${LARGO_MAXIMO_TEXTO} caracteres` },
      { status: 400 },
    );
  }

  const resultado = await registrarMovimientoManual(texto, tipoElegido.tipo);
  // Devolver lo recibido permite ver en el atajo qué transcribió Siri o qué
  // variable se envió, sin guardar el texto en los logs del servidor.
  if (!resultado.ok) {
    return Response.json({ error: `${resultado.error}. Recibí: "${texto}"` }, { status: 422 });
  }

  return Response.json(
    { mensaje: mensajeDeConfirmacion(resultado.movimiento), movimiento: resultado.movimiento },
    { status: 201 },
  );
}
