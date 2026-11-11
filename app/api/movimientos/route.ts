import { tokenApiValido } from "@/lib/auth/token-api.ts";
import { mensajeDeConfirmacion } from "@/lib/movimientos/mensaje-confirmacion.ts";
import { registrarMovimientoManual } from "@/lib/movimientos/registrar-movimiento-manual.ts";

const LARGO_MAXIMO_TEXTO = 200;

export async function POST(request: Request) {
  if (!tokenApiValido(request.headers.get("authorization"))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const texto = await leerTexto(request);
  if (texto === null) {
    return Response.json(
      { error: `Envía un JSON {"texto": "..."} de hasta ${LARGO_MAXIMO_TEXTO} caracteres` },
      { status: 400 },
    );
  }

  const resultado = await registrarMovimientoManual(texto);
  if (!resultado.ok) return Response.json({ error: resultado.error }, { status: 422 });

  return Response.json(
    { mensaje: mensajeDeConfirmacion(resultado.movimiento), movimiento: resultado.movimiento },
    { status: 201 },
  );
}

async function leerTexto(request: Request): Promise<string | null> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return null;
  }

  if (typeof cuerpo !== "object" || cuerpo === null || !("texto" in cuerpo)) return null;
  if (typeof cuerpo.texto !== "string") return null;

  const texto = cuerpo.texto.trim();
  return texto && texto.length <= LARGO_MAXIMO_TEXTO ? texto : null;
}
