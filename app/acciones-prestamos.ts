"use server";

import { revalidatePath } from "next/cache";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { esFechaIsoValida, fechaEnLima } from "@/lib/fechas/lima.ts";
import { leerMontoExacto } from "@/lib/ingreso/leer-monto-exacto.ts";
import { validarPrestamo } from "@/lib/prestamos/prestamo.ts";
import { registrarPrestamo } from "@/lib/prestamos/registrar-prestamo.ts";
import type { ResultadoAccion } from "./acciones.ts";

// En la web cada dato va en su campo y la fecha llega del selector de fecha;
// el atajo, en cambio, manda frases dictadas (ver /api/prestamos).
export async function registrarPrestamoDesdeWeb(_anterior: ResultadoAccion, formulario: FormData): Promise<ResultadoAccion> {
  await exigirPropietario();

  const persona = String(formulario.get("persona") ?? "");
  const montoCentimos = leerMontoExacto(String(formulario.get("monto") ?? ""));
  const devolucionCentimos = leerMontoExacto(String(formulario.get("devolucion") ?? ""));
  const fechaDevolucion = String(formulario.get("fechaDevolucion") ?? "");

  if (montoCentimos === null) return { ok: false, mensaje: "Escribe cuánto prestas, por ejemplo 120." };
  if (devolucionCentimos === null) return { ok: false, mensaje: "Escribe cuánto te devuelve, por ejemplo 130." };
  if (!esFechaIsoValida(fechaDevolucion)) return { ok: false, mensaje: "Elige cuándo te devuelve." };

  const hoy = fechaEnLima(new Date());
  const validacion = validarPrestamo({ persona, montoCentimos, devolucionCentimos, fecha: hoy, fechaDevolucion }, hoy);
  if (!validacion.ok) return { ok: false, mensaje: validacion.error };

  const mensaje = await registrarPrestamo(validacion.prestamo, `préstamo desde la web: ${validacion.prestamo.persona}`);
  revalidatePath("/");
  return { ok: true, mensaje };
}
