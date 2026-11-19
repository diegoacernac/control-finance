import { createHash, timingSafeEqual } from "node:crypto";

const PATRON_BEARER = /^Bearer (.+)$/;

// Comparar hashes iguala el largo de ambos buffers (timingSafeEqual lo exige)
// y evita filtrar por tiempo de respuesta cuántos caracteres acertó alguien.
// Cada cliente tiene su token (el atajo, el script de Gmail): si uno se filtra,
// se cambia sin tocar el otro.
export function tokenApiValido(cabeceraAutorizacion: string | null, variable = "INGRESO_API_TOKEN"): boolean {
  const esperado = process.env[variable];
  if (!esperado) throw new Error(`Falta ${variable}`);

  const recibido = cabeceraAutorizacion?.match(PATRON_BEARER)?.[1];
  if (!recibido) return false;

  return timingSafeEqual(sha256(recibido), sha256(esperado));
}

function sha256(valor: string): Buffer {
  return createHash("sha256").update(valor).digest();
}
