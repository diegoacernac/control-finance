import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Usa la clave secreta, que se salta el RLS: este cliente solo debe importarse
// desde código de servidor (route handlers), nunca desde componentes de cliente.
export function crearClienteServidor(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const claveSecreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !claveSecreta) throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY");

  return createClient(url, claveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
