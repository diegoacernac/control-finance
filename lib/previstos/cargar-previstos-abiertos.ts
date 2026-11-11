import type { SupabaseClient } from "@supabase/supabase-js";
import { sumarDias } from "../fechas/lima.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { DIAS_DE_ANTICIPACION, type PrevistoAbierto } from "./elegir-previsto.ts";

type FilaPrevistoAbierto = {
  id: number;
  fijo_id: number | null;
  nombre: string;
  tipo: TipoMovimiento;
  categoria_id: number;
  categoria_nombre: string;
  persona: string | null;
  patrones: string[];
  fecha_esperada: string | null;
};

// Antes de leer, genera los previstos que falten hasta donde alcanza la
// ventana de anticipación (un pago adelantado puede ser del mes siguiente).
export async function cargarPrevistosAbiertos(
  supabase: SupabaseClient,
  tipo: TipoMovimiento,
  fecha: string,
): Promise<PrevistoAbierto[]> {
  const { error: errorGeneracion } = await supabase.rpc("asegurar_previstos", {
    p_hasta: sumarDias(fecha, DIAS_DE_ANTICIPACION),
  });
  if (errorGeneracion) throw new Error(`No se pudieron generar los previstos: ${errorGeneracion.message}`);

  const { data, error } = await supabase
    .from("previstos_abiertos")
    .select("id, fijo_id, nombre, tipo, categoria_id, categoria_nombre, persona, patrones, fecha_esperada")
    .eq("tipo", tipo)
    .overrideTypes<FilaPrevistoAbierto[], { merge: false }>();
  if (error) throw new Error(`No se pudieron cargar los previstos: ${error.message}`);

  return data.map((fila) => ({
    id: fila.id,
    fijoId: fila.fijo_id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    categoriaId: fila.categoria_id,
    categoriaNombre: fila.categoria_nombre,
    persona: fila.persona,
    patrones: fila.patrones,
    fechaEsperada: fila.fecha_esperada,
  }));
}
