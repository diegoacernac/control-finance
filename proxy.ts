import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { variableRequerida } from "./lib/entorno.ts";

// Renueva la sesión antes de cada página: los Server Components no pueden
// escribir cookies, así que sin esto la sesión se caería al vencer el token.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(variableRequerida("SUPABASE_URL"), variableRequerida("SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (nuevas) => {
        nuevas.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        nuevas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return respuesta;
}

// La API usa su propio token y los archivos estáticos no llevan sesión.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
