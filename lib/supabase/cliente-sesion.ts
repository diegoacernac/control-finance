import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { variableRequerida } from "../entorno.ts";

// Cliente con la clave publicable y las cookies del navegador: solo sirve para
// saber quién inició sesión. Los datos se leen con el cliente de servidor.
export async function crearClienteSesion(): Promise<SupabaseClient> {
  const almacenCookies = await cookies();

  return createServerClient(variableRequerida("SUPABASE_URL"), variableRequerida("SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => almacenCookies.getAll(),
      setAll: (nuevas) => {
        try {
          nuevas.forEach(({ name, value, options }) => almacenCookies.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies; el proxy ya renovó la sesión.
        }
      },
    },
  });
}
