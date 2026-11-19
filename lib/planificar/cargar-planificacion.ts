import type { PostgrestError } from "@supabase/supabase-js";
import { finDeMes, inicioDeMes } from "../fechas/lima.ts";
import type { EstadoPrevisto } from "../movimientos/registrar-movimiento-manual.ts";
import type { TipoMovimiento } from "../movimientos/tipos.ts";
import type { OpcionCategoria } from "../panel/tipos.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import { CATEGORIA_AHORRO, type PrevistoPlan } from "./tipos.ts";

export type AhorroMensual = { montoCentimos: number; dia: number } | null;

export type DatosPlanificacion = {
  saldoCentimos: number;
  previstos: PrevistoPlan[];
  gastoVariableMensualCentimos: number;
  gastoVariableDelMesCentimos: number;
  ahorroMensual: AhorroMensual;
  categorias: OpcionCategoria[];
};

type FilaPrevisto = {
  id: number;
  fijo_id: number | null;
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
  planeado: boolean;
};

type FilaFijoAhorro = { monto_centimos: number; dias_pago: number[]; categorias: { nombre: string } };

const COLUMNAS_PREVISTO =
  "id, fijo_id, nombre, tipo, categoria_nombre, persona, fecha_esperada, numero_cuota, cuotas_total, estado, monto_esperado_centimos, pagado_centimos, planeado";

export async function cargarPlanificacion(hoy: string, hasta: string): Promise<DatosPlanificacion> {
  const supabase = crearClienteServidor();

  // Genera los previstos de los fijos hasta el fin del rango, para poder
  // verlos y omitirlos con anticipación.
  const { error: errorGeneracion } = await supabase.rpc("asegurar_previstos", { p_hasta: hasta });
  if (errorGeneracion) throw errorDeCarga("los previstos", errorGeneracion);

  const [saldos, previstos, variableDelMes, ajustes, ahorro, categorias] = await Promise.all([
    supabase.from("saldos_cuentas").select("saldo_centimos").overrideTypes<{ saldo_centimos: number }[], { merge: false }>(),
    supabase
      .from("previstos_con_pago")
      .select(COLUMNAS_PREVISTO)
      .in("estado", ["pendiente", "parcial", "omitido"])
      .lte("fecha_esperada", hasta)
      .overrideTypes<FilaPrevisto[], { merge: false }>(),
    // Gasto variable = lo que no corresponde a un previsto y sí es consumo.
    supabase
      .from("movimientos_con_categoria")
      .select("monto_centimos")
      .eq("tipo", "egreso")
      .eq("moneda", "PEN")
      .is("previsto_id", null)
      .eq("cuenta_como_gasto", true)
      .gte("fecha", inicioDeMes(hoy))
      .lte("fecha", finDeMes(hoy))
      .overrideTypes<{ monto_centimos: number }[], { merge: false }>(),
    supabase.from("planificacion").select("gasto_variable_centimos").single<{ gasto_variable_centimos: number }>(),
    supabase
      .from("fijos")
      .select("monto_centimos, dias_pago, categorias!inner(nombre)")
      .eq("activo", true)
      .eq("categorias.nombre", CATEGORIA_AHORRO)
      .limit(1)
      .overrideTypes<FilaFijoAhorro[], { merge: false }>(),
    supabase
      .from("categorias_con_nombre")
      .select("id, tipo, nombre_completo")
      .order("nombre_completo")
      .overrideTypes<{ id: number; tipo: TipoMovimiento; nombre_completo: string }[], { merge: false }>(),
  ]);

  if (saldos.error) throw errorDeCarga("los saldos", saldos.error);
  if (previstos.error) throw errorDeCarga("los previstos", previstos.error);
  if (variableDelMes.error) throw errorDeCarga("el gasto del mes", variableDelMes.error);
  if (ajustes.error) throw errorDeCarga("el gasto variable", ajustes.error);
  if (ahorro.error) throw errorDeCarga("el ahorro mensual", ahorro.error);
  if (categorias.error) throw errorDeCarga("las categorías", categorias.error);

  const fijoAhorro = ahorro.data[0];
  return {
    saldoCentimos: saldos.data.reduce((suma, f) => suma + f.saldo_centimos, 0),
    previstos: previstos.data.map(aPrevisto),
    gastoVariableMensualCentimos: ajustes.data.gasto_variable_centimos,
    gastoVariableDelMesCentimos: variableDelMes.data.reduce((suma, f) => suma + f.monto_centimos, 0),
    ahorroMensual: fijoAhorro ? { montoCentimos: fijoAhorro.monto_centimos, dia: fijoAhorro.dias_pago[0] } : null,
    categorias: categorias.data.map((f) => ({ id: f.id, tipo: f.tipo, nombre: f.nombre_completo })),
  };
}

function errorDeCarga(que: string, error: PostgrestError): Error {
  return new Error(`No se pudieron cargar ${que}: ${error.message}`);
}

function aPrevisto(fila: FilaPrevisto): PrevistoPlan {
  return {
    id: fila.id,
    fijoId: fila.fijo_id,
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
    planeado: fila.planeado,
  };
}
