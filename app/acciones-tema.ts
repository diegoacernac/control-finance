"use server";

import { cookies } from "next/headers";
import { COOKIE_TEMA, esTema } from "@/lib/tema.ts";

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

export async function cambiarTema(tema: unknown): Promise<void> {
  if (!esTema(tema)) throw new Error("Tema inválido");

  (await cookies()).set(COOKIE_TEMA, tema, {
    path: "/",
    maxAge: UN_ANIO_EN_SEGUNDOS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
