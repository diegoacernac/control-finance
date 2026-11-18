"use client";

import { useActionState } from "react";
import { registrarPrestamoDesdeWeb } from "../acciones-prestamos.ts";
import estilos from "../panel.module.css";

export function FormularioPrestamo({ hoy }: { hoy: string }) {
  const [resultado, accion, enviando] = useActionState(registrarPrestamoDesdeWeb, null);

  return (
    <form action={accion} className={estilos.formularioEdicion}>
      <div className={`${estilos.campoEdicion} ${estilos.campoAncho}`}>
        <label htmlFor="prestamo-persona">A quién</label>
        <input id="prestamo-persona" name="persona" required maxLength={60} autoComplete="off" placeholder="Gaby" className={estilos.selector} />
      </div>
      <div className={estilos.campoEdicion}>
        <label htmlFor="prestamo-monto">Le prestas (S/)</label>
        <input id="prestamo-monto" name="monto" required inputMode="decimal" placeholder="120" className={estilos.selector} />
      </div>
      <div className={estilos.campoEdicion}>
        <label htmlFor="prestamo-devolucion">Te devuelve (S/)</label>
        <input id="prestamo-devolucion" name="devolucion" required inputMode="decimal" placeholder="130" className={estilos.selector} />
      </div>
      <div className={`${estilos.campoEdicion} ${estilos.campoAncho}`}>
        <label htmlFor="prestamo-fecha">Cuándo te devuelve</label>
        <input id="prestamo-fecha" name="fechaDevolucion" type="date" required min={hoy} className={estilos.selector} />
      </div>

      <div className={estilos.pieEdicion}>
        <button type="submit" disabled={enviando} className={estilos.boton}>
          {enviando ? "Anotando…" : "Anotar préstamo"}
        </button>
        <p role="status" className={resultado?.ok === false ? estilos.mensajeError : estilos.mensajeOk}>
          {resultado?.mensaje}
        </p>
      </div>
    </form>
  );
}
