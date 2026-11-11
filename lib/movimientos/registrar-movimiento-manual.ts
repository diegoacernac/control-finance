import { cargarReglas } from "../categorias/cargar-reglas.ts";
import { categorizar } from "../categorias/categorizar.ts";
import { fechaEnLima } from "../fechas/lima.ts";
import { parsearTexto } from "../ingreso/parsear-texto.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import type { Moneda, TipoMovimiento } from "./tipos.ts";

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
};

export type ResultadoRegistro = { ok: true; movimiento: MovimientoRegistrado } | { ok: false; error: string };

type FilaRegistro = { id_movimiento: number; total_mes_centimos: number };

export async function registrarMovimientoManual(texto: string): Promise<ResultadoRegistro> {
  const parseo = parsearTexto(texto, fechaEnLima(new Date()));
  if (!parseo.ok) return parseo;

  const { movimiento } = parseo;
  const supabase = crearClienteServidor();
  const { tipo, categoria } = categorizar(movimiento.descripcion, movimiento.tipoExplicito, await cargarReglas(supabase));

  const { data, error } = await supabase
    .rpc("registrar_movimiento_manual", {
      p_texto: texto,
      p_tipo: tipo,
      p_monto_centimos: movimiento.montoCentimos,
      p_moneda: movimiento.moneda,
      p_fecha: movimiento.fecha,
      p_descripcion: movimiento.descripcion,
      p_persona: movimiento.persona,
      p_categoria_id: categoria?.id ?? null,
    })
    .single<FilaRegistro>();

  if (error) throw new Error(`No se pudo registrar el movimiento: ${error.message}`);

  return {
    ok: true,
    movimiento: {
      id: data.id_movimiento,
      tipo,
      categoria: categoria?.nombre ?? null,
      montoCentimos: movimiento.montoCentimos,
      moneda: movimiento.moneda,
      fecha: movimiento.fecha,
      descripcion: movimiento.descripcion,
      persona: movimiento.persona,
      porRevisar: categoria === null,
      totalMesCentimos: data.total_mes_centimos,
    },
  };
}
