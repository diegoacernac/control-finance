import { cookies } from "next/headers";

export type Tema = "auto" | "claro" | "oscuro";

export const TEMAS: Tema[] = ["auto", "claro", "oscuro"];
export const COOKIE_TEMA = "tema";

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === "string" && (TEMAS as string[]).includes(valor);
}

export async function leerTema(): Promise<Tema> {
  const valor = (await cookies()).get(COOKIE_TEMA)?.value;
  return esTema(valor) ? valor : "auto";
}
