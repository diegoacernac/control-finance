import type { PostgrestError } from "@supabase/supabase-js";
import { finDeMes, inicioDeMes } from "../fechas/lima.ts";
import type { EstadoPrevisto } from "../movimientos/registrar-movimiento-manual.ts";
import type { Moneda, TipoMovimiento } from "../movimientos/tipos.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import type { MovimientoPanel, OpcionCategoria, PrevistoPanel, SaldoCuenta } from "./tipos.ts";

export type DatosPanel = {
  saldos: SaldoCuenta[];
  previstos: PrevistoPanel[];
  movimientosDelMes: MovimientoPanel[];
  porRevisar: MovimientoPanel[];
  ultimosMovimientos: MovimientoPanel[];
  categorias: OpcionCategoria[];
};

type FilaSaldo = { id: number; nombre: string; saldo_centimos: number };

type FilaPrevisto = {
  id: number;
  nombre: string;
  tipo: TipoMovimiento;
  categoria_nombre: string;
  persona: string | null;
  fecha_esperada: string | null;
  numero_cuota: number | null;
  cuotas_total: number | null;
  estado: EstadoPrevisto;
  monto_esperado_centimos: number;
  pagado_centimos: number;
};

type FilaMovimiento = {
  id: number;
  tipo: TipoMovimiento;
  monto_centimos: number;
  moneda: Moneda;
  fecha: string;
  descripcion: string;
  categoria_nombre: string | null;
  categoria_raiz: string | null;
  previsto_nombre: string | null;
};

type FilaCategoria = { id: number; tipo: TipoMovimiento; nombre_completo: string };

const COLUMNAS_PREVISTO =
  "id, nombre, tipo, categoria_nombre, persona, fecha_esperada, numero_cuota, cuotas_total, estado, monto_esperado_centimos, pagado_centimos";
const COLUMNAS_MOVIMIENTO =
  "id, tipo, monto_centimos, moneda, fecha, descripcion, categoria_nombre, categoria_raiz, previsto_nombre";
const CANTIDAD_ULTIMOS_MOVIMIENTOS = 10;

export async function cargarPanel(hoy: string): Promise<DatosPanel> {
  const supabase = crearClienteServidor();
  const inicio = inicioDeMes(hoy);
  const fin = finDeMes(hoy);

  // Los previstos del mes deben existir aunque todavía no se haya registrado nada.
  const { error: errorGeneracion } = await supabase.rpc("asegurar_previstos", { p_hasta: fin });
  if (errorGeneracion) throw errorDeCarga("los previstos", errorGeneracion);

  const [saldos, previstos, delMes, porRevisar, ultimos, categorias] = await Promise.all([
    supabase.from("saldos_cuentas").select("id, nombre, saldo_centimos").order("id").overrideTypes<FilaSaldo[], { merge: false }>(),
    // Todo lo abierto, venga de cuando venga, más lo ya resuelto de este mes.
    supabase
      .from("previstos_con_pago")
      .select(COLUMNAS_PREVISTO)
      .or(`estado.in.(pendiente,parcial),and(fecha_esperada.gte.${inicio},fecha_esperada.lte.${fin})`)
      .overrideTypes<FilaPrevisto[], { merge: false }>(),
    supabase
      .from("movimientos_con_categoria")
      .select(COLUMNAS_MOVIMIENTO)
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .overrideTypes<FilaMovimiento[], { merge: false }>(),
    supabase
      .from("movimientos_con_categoria")
      .select(COLUMNAS_MOVIMIENTO)
      .eq("por_revisar", true)
      .order("creado_en", { ascending: false })
      .overrideTypes<FilaMovimiento[], { merge: false }>(),
    supabase
      .from("movimientos_con_categoria")
      .select(COLUMNAS_MOVIMIENTO)
      .order("creado_en", { ascending: false })
      .limit(CANTIDAD_ULTIMOS_MOVIMIENTOS)
      .overrideTypes<FilaMovimiento[], { merge: false }>(),
    supabase
      .from("categorias_con_nombre")
      .select("id, tipo, nombre_completo")
      .order("nombre_completo")
      .overrideTypes<FilaCategoria[], { merge: false }>(),
  ]);

  if (saldos.error) throw errorDeCarga("los saldos", saldos.error);
  if (previstos.error) throw errorDeCarga("los previstos", previstos.error);
  if (delMes.error) throw errorDeCarga("los movimientos del mes", delMes.error);
  if (porRevisar.error) throw errorDeCarga("los movimientos por revisar", porRevisar.error);
  if (ultimos.error) throw errorDeCarga("los últimos movimientos", ultimos.error);
  if (categorias.error) throw errorDeCarga("las categorías", categorias.error);

  return {
    saldos: saldos.data.map((f) => ({ id: f.id, nombre: f.nombre, saldoCentimos: f.saldo_centimos })),
    previstos: previstos.data.map(aPrevisto),
    movimientosDelMes: delMes.data.map(aMovimiento),
    porRevisar: porRevisar.data.map(aMovimiento),
    ultimosMovimientos: ultimos.data.map(aMovimiento),
    categorias: categorias.data.map((f) => ({ id: f.id, tipo: f.tipo, nombre: f.nombre_completo })),
  };
}

function errorDeCarga(que: string, error: PostgrestError): Error {
  return new Error(`No se pudieron cargar ${que}: ${error.message}`);
}

function aPrevisto(fila: FilaPrevisto): PrevistoPanel {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    categoriaNombre: fila.categoria_nombre,
    persona: fila.persona,
    fechaEsperada: fila.fecha_esperada,
    numeroCuota: fila.numero_cuota,
    cuotasTotal: fila.cuotas_total,
    estado: fila.estado,
    montoEsperadoCentimos: fila.monto_esperado_centimos,
    pagadoCentimos: fila.pagado_centimos,
  };
}

function aMovimiento(fila: FilaMovimiento): MovimientoPanel {
  return {
    id: fila.id,
    tipo: fila.tipo,
    montoCentimos: fila.monto_centimos,
    moneda: fila.moneda,
    fecha: fila.fecha,
    descripcion: fila.descripcion,
    categoriaNombre: fila.categoria_nombre,
    categoriaRaiz: fila.categoria_raiz,
    previstoNombre: fila.previsto_nombre,
  };
}
