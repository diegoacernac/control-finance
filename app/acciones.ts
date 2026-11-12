"use server";

import { revalidatePath } from "next/cache";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { esFechaIsoValida } from "@/lib/fechas/lima.ts";
import { leerMontoExacto } from "@/lib/ingreso/leer-monto-exacto.ts";
import { mensajeDeConfirmacion } from "@/lib/movimientos/mensaje-confirmacion.ts";
import { LARGO_MAXIMO_TEXTO } from "@/lib/movimientos/limites.ts";
import { registrarMovimientoManual } from "@/lib/movimientos/registrar-movimiento-manual.ts";
import { parsearDestino } from "@/lib/panel/destino.ts";
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor.ts";

export type ResultadoAccion = { ok: boolean; mensaje: string } | null;

export async function registrarDesdeWeb(_anterior: ResultadoAccion, formulario: FormData): Promise<ResultadoAccion> {
  await exigirPropietario();

  const texto = String(formulario.get("texto") ?? "").trim();
  if (!texto || texto.length > LARGO_MAXIMO_TEXTO) {
    return { ok: false, mensaje: `Escribe el movimiento, hasta ${LARGO_MAXIMO_TEXTO} caracteres.` };
  }

  const resultado = await registrarMovimientoManual(texto);
  if (!resultado.ok) return { ok: false, mensaje: resultado.error };

  revalidatePath("/");
  return { ok: true, mensaje: mensajeDeConfirmacion(resultado.movimiento) };
}

// El destino vacío significa "mantener a lo que ya corresponde".
export async function editarMovimiento(
  movimientoId: number,
  _anterior: ResultadoAccion,
  formulario: FormData,
): Promise<ResultadoAccion> {
  await exigirPropietario();

  const montoCentimos = leerMontoExacto(String(formulario.get("monto") ?? ""));
  if (montoCentimos === null) return { ok: false, mensaje: "Escribe solo el monto, por ejemplo 12.50." };

  const fecha = String(formulario.get("fecha") ?? "");
  if (!esFechaIsoValida(fecha)) return { ok: false, mensaje: "Elige una fecha válida." };

  const descripcion = String(formulario.get("descripcion") ?? "").trim();
  if (!descripcion || descripcion.length > LARGO_MAXIMO_TEXTO) {
    return { ok: false, mensaje: `Escribe una descripción de hasta ${LARGO_MAXIMO_TEXTO} caracteres.` };
  }

  const valorDestino = String(formulario.get("destino") ?? "");
  const destino = valorDestino ? parsearDestino(valorDestino) : null;
  if (valorDestino && !destino) return { ok: false, mensaje: "Elige a qué corresponde de la lista." };

  const { error } = await crearClienteServidor().rpc("editar_movimiento", {
    p_movimiento_id: idValido(movimientoId),
    p_monto_centimos: montoCentimos,
    p_fecha: fecha,
    p_descripcion: descripcion,
    p_cambiar_destino: destino !== null,
    p_categoria_id: destino?.categoriaId ?? null,
    p_previsto_id: destino?.previstoId ?? null,
  });
  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidatePath("/");
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function omitirPrevisto(previstoId: number): Promise<void> {
  await ejecutar("cambiar_omision_previsto", { p_previsto_id: idValido(previstoId), p_omitir: true });
}

export async function reabrirPrevisto(previstoId: number): Promise<void> {
  await ejecutar("cambiar_omision_previsto", { p_previsto_id: idValido(previstoId), p_omitir: false });
}

export async function resolverMovimiento(movimientoId: number, formulario: FormData): Promise<void> {
  const destino = parsearDestino(String(formulario.get("destino") ?? ""));
  if (!destino) throw new Error("Elige a qué corresponde el movimiento");

  await ejecutar("resolver_movimiento", {
    p_movimiento_id: idValido(movimientoId),
    p_categoria_id: destino.categoriaId,
    p_previsto_id: destino.previstoId,
  });
}

export async function eliminarMovimiento(movimientoId: number): Promise<void> {
  await ejecutar("eliminar_movimiento", { p_movimiento_id: idValido(movimientoId) });
}

async function ejecutar(funcion: string, parametros: Record<string, number | boolean | null>): Promise<void> {
  await exigirPropietario();

  const { error } = await crearClienteServidor().rpc(funcion, parametros);
  if (error) throw new Error(`No se pudo completar la acción: ${error.message}`);

  revalidatePath("/");
}

// Los argumentos de una acción llegan del navegador: no se confía en su tipo.
function idValido(id: unknown): number {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador inválido");
  return id;
}
