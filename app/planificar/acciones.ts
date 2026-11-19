"use server";

import { revalidatePath } from "next/cache";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { fechaEnLima } from "@/lib/fechas/lima.ts";
import { leerDiaDelMes, leerMontoOCero, validarPlaneado } from "@/lib/planificar/validar-formularios.ts";
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor.ts";
import type { ResultadoAccion } from "../acciones.ts";

export async function planearPrevisto(_anterior: ResultadoAccion, formulario: FormData): Promise<ResultadoAccion> {
  await exigirPropietario();

  const validacion = validarPlaneado(
    {
      nombre: String(formulario.get("nombre") ?? ""),
      tipo: String(formulario.get("tipo") ?? ""),
      categoriaId: String(formulario.get("categoria") ?? ""),
      monto: String(formulario.get("monto") ?? ""),
      fecha: String(formulario.get("fecha") ?? ""),
    },
    fechaEnLima(new Date()),
  );
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };

  const { nombre, tipo, categoriaId, montoCentimos, fecha, patrones } = validacion.valor;
  const { error } = await crearClienteServidor().rpc("planear_previsto", {
    p_nombre: nombre,
    p_tipo: tipo,
    p_categoria_id: categoriaId,
    p_monto_centimos: montoCentimos,
    p_fecha: fecha,
    p_patrones: patrones,
  });
  if (error) return { ok: false, mensaje: `No se pudo anotar: ${error.message}` };

  revalidarTodo();
  return { ok: true, mensaje: `${nombre} anotado.` };
}

export async function quitarPlaneado(previstoId: number): Promise<void> {
  await exigirPropietario();
  if (!Number.isSafeInteger(previstoId) || previstoId <= 0) throw new Error("Identificador inválido");

  const { error } = await crearClienteServidor().rpc("quitar_previsto_planeado", { p_previsto_id: previstoId });
  if (error) throw new Error(`No se pudo quitar: ${error.message}`);
  revalidarTodo();
}

export async function guardarAhorro(_anterior: ResultadoAccion, formulario: FormData): Promise<ResultadoAccion> {
  await exigirPropietario();

  const montoCentimos = leerMontoOCero(String(formulario.get("monto") ?? ""));
  if (montoCentimos === null) return { ok: false, mensaje: "Escribe el monto, o 0 para dejar de ahorrar." };
  const dia = leerDiaDelMes(String(formulario.get("dia") ?? ""));
  if (dia === null) return { ok: false, mensaje: "Elige un día del 1 al 31." };

  const { error } = await crearClienteServidor().rpc("configurar_ahorro", { p_monto_centimos: montoCentimos, p_dia: dia });
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidarTodo();
  return { ok: true, mensaje: montoCentimos === 0 ? "Ahorro mensual desactivado." : "Ahorro mensual guardado." };
}

export async function guardarGastoVariable(_anterior: ResultadoAccion, formulario: FormData): Promise<ResultadoAccion> {
  await exigirPropietario();

  const montoCentimos = leerMontoOCero(String(formulario.get("monto") ?? ""));
  if (montoCentimos === null) return { ok: false, mensaje: "Escribe solo el monto, por ejemplo 450." };

  const { error } = await crearClienteServidor()
    .from("planificacion")
    .update({ gasto_variable_centimos: montoCentimos })
    .eq("id", true);
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidarTodo();
  return { ok: true, mensaje: "Gasto variable guardado." };
}

// El panel también muestra previstos y el ahorro: se refrescan ambas páginas.
function revalidarTodo(): void {
  revalidatePath("/", "layout");
}
