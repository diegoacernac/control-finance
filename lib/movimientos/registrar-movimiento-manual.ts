import type { SupabaseClient } from "@supabase/supabase-js";
import { cargarReglas } from "../categorias/cargar-reglas.ts";
import { categorizar, type Categorizacion } from "../categorias/categorizar.ts";
import { fechaEnLima } from "../fechas/lima.ts";
import { parsearTexto, type MovimientoParseado } from "../ingreso/parsear-texto.ts";
import { cargarPrevistosAbiertos } from "../previstos/cargar-previstos-abiertos.ts";
import { elegirPrevisto, type EleccionPrevisto } from "../previstos/elegir-previsto.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import type { Moneda, TipoMovimiento } from "./tipos.ts";

export type EstadoPrevisto = "pendiente" | "parcial" | "confirmado" | "omitido";

export type MovimientoRegistrado = {
  id: number;
  tipo: TipoMovimiento;
  categoria: string | null;
  montoCentimos: number;
  moneda: Moneda;
  fecha: string;
  descripcion: string;
  persona: string | null;
  porRevisar: boolean;
  totalMesCentimos: number;
  previsto: { nombre: string; estado: EstadoPrevisto; restanteCentimos: number } | null;
  previstosPosibles: string[];
};

export type ResultadoRegistro = { ok: true; movimiento: MovimientoRegistrado } | { ok: false; error: string };

type FilaRegistro = {
  id_movimiento: number;
  total_mes_centimos: number;
  previsto_estado: EstadoPrevisto | null;
  previsto_restante_centimos: number | null;
};

type Clasificacion = {
  categoria: { id: number; nombre: string } | null;
  origen: "regla" | "fijo" | null;
  eleccion: EleccionPrevisto;
};

export async function registrarMovimientoManual(texto: string): Promise<ResultadoRegistro> {
  const parseo = parsearTexto(texto, fechaEnLima(new Date()));
  if (!parseo.ok) return parseo;

  const { movimiento } = parseo;
  const supabase = crearClienteServidor();
  const categorizacion = categorizar(movimiento.descripcion, movimiento.tipoExplicito, await cargarReglas(supabase));
  const clasificacion = await clasificar(supabase, movimiento, categorizacion);
  const previstoElegido = clasificacion.eleccion.resultado === "elegido" ? clasificacion.eleccion.previsto : null;
  const porRevisar = clasificacion.categoria === null || clasificacion.eleccion.resultado === "ambiguo";

  const { data, error } = await supabase
    .rpc("registrar_movimiento_manual", {
      p_texto: texto,
      p_tipo: categorizacion.tipo,
      p_monto_centimos: movimiento.montoCentimos,
      p_moneda: movimiento.moneda,
      p_fecha: movimiento.fecha,
      p_descripcion: movimiento.descripcion,
      p_persona: movimiento.persona,
      p_categoria_id: clasificacion.categoria?.id ?? null,
      p_origen_categoria: clasificacion.origen,
      p_por_revisar: porRevisar,
      p_previsto_id: previstoElegido?.id ?? null,
    })
    .single<FilaRegistro>();

  if (error) throw new Error(`No se pudo registrar el movimiento: ${error.message}`);

  return {
    ok: true,
    movimiento: {
      id: data.id_movimiento,
      tipo: categorizacion.tipo,
      categoria: clasificacion.categoria?.nombre ?? null,
      montoCentimos: movimiento.montoCentimos,
      moneda: movimiento.moneda,
      fecha: movimiento.fecha,
      descripcion: movimiento.descripcion,
      persona: movimiento.persona,
      porRevisar,
      totalMesCentimos: data.total_mes_centimos,
      previsto:
        previstoElegido && data.previsto_estado
          ? {
              nombre: previstoElegido.nombre,
              estado: data.previsto_estado,
              restanteCentimos: data.previsto_restante_centimos ?? 0,
            }
          : null,
      previstosPosibles: clasificacion.eleccion.resultado === "ambiguo" ? clasificacion.eleccion.nombres : [],
    },
  };
}

// Si el texto corresponde a un fijo o previsto, su categoría manda sobre la
// regla. Los fijos están en soles, así que un monto en dólares no se asocia.
async function clasificar(
  supabase: SupabaseClient,
  movimiento: MovimientoParseado,
  categorizacion: Categorizacion,
): Promise<Clasificacion> {
  const porRegla: Clasificacion = {
    categoria: categorizacion.categoria,
    origen: categorizacion.categoria ? "regla" : null,
    eleccion: { resultado: "ninguno" },
  };
  if (movimiento.moneda !== "PEN") return porRegla;

  const previstos = await cargarPrevistosAbiertos(supabase, categorizacion.tipo, movimiento.fecha);
  const eleccion = elegirPrevisto(movimiento.descripcion, categorizacion.tipo, movimiento.fecha, previstos);
  if (eleccion.resultado !== "elegido") return { ...porRegla, eleccion };

  return {
    categoria: { id: eleccion.previsto.categoriaId, nombre: eleccion.previsto.categoriaNombre },
    origen: "fijo",
    eleccion,
  };
}
