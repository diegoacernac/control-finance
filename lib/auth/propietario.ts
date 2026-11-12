import { redirect } from "next/navigation";
import { variableRequerida } from "../entorno.ts";
import { crearClienteSesion } from "../supabase/cliente-sesion.ts";

export const RUTA_INGRESO = "/ingresar";

export function esCorreoPropietario(correo: string | null | undefined): boolean {
  if (!correo) return false;
  return correo.trim().toLowerCase() === variableRequerida("CORREO_PROPIETARIO").trim().toLowerCase();
}

// La web es de una sola persona: una sesión válida de cualquier otro correo
// no alcanza. Se llama en cada página y en cada acción, porque las acciones de
// servidor son endpoints públicos aunque no haya un botón que las invoque.
export async function exigirPropietario(): Promise<void> {
  const supabase = await crearClienteSesion();
  const { data } = await supabase.auth.getUser();
  if (!esCorreoPropietario(data.user?.email)) redirect(RUTA_INGRESO);
}
