import { tokenApiValido } from "@/lib/auth/token-api.ts";
import { esRemitenteInterbank, leerCorreoRecibido } from "@/lib/correos/correo-recibido.ts";
import { interpretarCorreoInterbank } from "@/lib/correos/interpretar-correo-interbank.ts";
import { registrarCorreo } from "@/lib/correos/registrar-correo.ts";
import { leerCuerpoJson } from "@/lib/http/cuerpo-json.ts";

// Lo llama el script de Gmail por cada correo nuevo de Interbank.
// 200: procesado (creado, unido, duplicado), ignorado (no es una operación) o
// prueba (solo interpreta, no guarda). 422: parece una operación pero no se
// entendió; el script lo reporta sin reintentar.
export async function POST(request: Request) {
  if (!tokenApiValido(request.headers.get("authorization"), "CORREOS_API_TOKEN")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const cuerpo = await leerCuerpoJson(request);
  const correo = cuerpo ? leerCorreoRecibido(cuerpo) : null;
  if (!correo) {
    return Response.json(
      { error: 'Envía un JSON {"referencia", "remitente", "recibidoEn", "html" o "texto"}' },
      { status: 400 },
    );
  }

  if (!esRemitenteInterbank(correo.remitente)) {
    return Response.json({ resultado: "ignorado", motivo: "el remitente no es Interbank" });
  }

  const interpretacion = interpretarCorreoInterbank(correo.texto, correo.fechaRecibido);
  if (interpretacion.resultado === "error") {
    return Response.json({ error: interpretacion.error }, { status: 422 });
  }
  if (interpretacion.resultado === "ignorado") {
    return Response.json({ resultado: "ignorado", motivo: interpretacion.motivo });
  }
  if (correo.prueba) {
    return Response.json({ resultado: "prueba", operacion: interpretacion.operacion });
  }

  const resultado = await registrarCorreo(correo.referencia, interpretacion.operacion);
  return Response.json({ resultado });
}
