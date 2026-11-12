"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { esCorreoPropietario, RUTA_INGRESO } from "@/lib/auth/propietario.ts";
import { crearClienteSesion } from "@/lib/supabase/cliente-sesion.ts";

export type EstadoIngreso = { mensaje: string; esError: boolean } | null;

const LARGO_MAXIMO_CORREO = 254;

// La respuesta es la misma sea o no el correo correcto, para no revelar cuál
// es. Solo al correo del propietario se le envía el enlace.
export async function enviarEnlace(_anterior: EstadoIngreso, formulario: FormData): Promise<EstadoIngreso> {
  const correo = String(formulario.get("correo") ?? "").trim().toLowerCase();
  if (!correo || correo.length > LARGO_MAXIMO_CORREO) {
    return { mensaje: "Escribe tu correo.", esError: true };
  }

  if (esCorreoPropietario(correo)) {
    const origen = (await headers()).get("origin");
    const supabase = await crearClienteSesion();
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: `${origen}/auth/confirmar` },
    });
    if (error) return { mensaje: "No se pudo enviar el enlace. Intenta de nuevo en unos minutos.", esError: true };
  }

  return { mensaje: "Si el correo es el correcto, te llegó un enlace para entrar. Ábrelo en este mismo navegador.", esError: false };
}

// Google devuelve al usuario a /auth/confirmar con un código; ahí se crea la
// sesión y se comprueba que la cuenta sea la del propietario.
export async function ingresarConGoogle(): Promise<void> {
  const origen = (await headers()).get("origin");
  const supabase = await crearClienteSesion();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origen}/auth/confirmar`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) redirect(`${RUTA_INGRESO}?error=google`);
  redirect(data.url);
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteSesion();
  await supabase.auth.signOut();
  redirect(RUTA_INGRESO);
}
