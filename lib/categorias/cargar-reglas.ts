import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import type { ReglaCategoria } from "./categorizar.ts";

type FilaReglaConCategoria = {
  patron: string;
  categoria_id: number;
  categoria_tipo: TipoMovimiento;
  categoria_nombre: string;
};

export async function cargarReglas(supabase: SupabaseClient): Promise<ReglaCategoria[]> {
  const { data, error } = await supabase
    .from("reglas_con_categoria")
    .select("patron, categoria_id, categoria_tipo, categoria_nombre")
    .overrideTypes<FilaReglaConCategoria[], { merge: false }>();

  if (error) throw new Error(`No se pudieron cargar las reglas: ${error.message}`);

  return data.map((fila) => ({
    patron: fila.patron,
    categoriaId: fila.categoria_id,
    categoriaTipo: fila.categoria_tipo,
    categoriaNombre: fila.categoria_nombre,
  }));
}
