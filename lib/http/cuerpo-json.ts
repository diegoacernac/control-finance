import { LARGO_MAXIMO_TEXTO } from "../movimientos/limites.ts";

export type CuerpoJson = Record<string, unknown>;

export async function leerCuerpoJson(request: Request): Promise<CuerpoJson | null> {
  try {
    const cuerpo: unknown = await request.json();
    return typeof cuerpo === "object" && cuerpo !== null && !Array.isArray(cuerpo) ? (cuerpo as CuerpoJson) : null;
  } catch {
    return null;
  }
}

// Texto obligatorio, recortado y con largo acotado; null si no cumple.
export function campoDeTexto(cuerpo: CuerpoJson, nombre: string): string | null {
  const valor = cuerpo[nombre];
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto && texto.length <= LARGO_MAXIMO_TEXTO ? texto : null;
}
