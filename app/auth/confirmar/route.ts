import { NextResponse } from "next/server";
import { esCorreoPropietario, RUTA_INGRESO } from "@/lib/auth/propietario.ts";
import { crearClienteSesion } from "@/lib/supabase/cliente-sesion.ts";

// Destino del enlace del correo: cambia el código de un solo uso por la sesión.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");

  if (codigo) {
    const supabase = await crearClienteSesion();
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error && esCorreoPropietario(data.user?.email)) return NextResponse.redirect(`${origin}/`);
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(`${origin}${RUTA_INGRESO}?error=enlace`);
}
