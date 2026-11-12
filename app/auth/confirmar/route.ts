import { NextResponse } from "next/server";
import { esCorreoPropietario, RUTA_INGRESO } from "@/lib/auth/propietario.ts";
import { crearClienteSesion } from "@/lib/supabase/cliente-sesion.ts";

// Destino del enlace del correo y del ingreso con Google: cambia el código de
// un solo uso por la sesión. Una cuenta que no es la del propietario se cierra.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");
  if (!codigo) return NextResponse.redirect(`${origin}${RUTA_INGRESO}?error=ingreso`);

  const supabase = await crearClienteSesion();
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error) return NextResponse.redirect(`${origin}${RUTA_INGRESO}?error=ingreso`);

  if (!esCorreoPropietario(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}${RUTA_INGRESO}?error=cuenta`);
  }

  return NextResponse.redirect(`${origin}/`);
}
