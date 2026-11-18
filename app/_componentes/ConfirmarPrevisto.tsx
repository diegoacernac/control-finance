"use client";

import { useActionState } from "react";
import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import { confirmarPrevisto } from "../acciones.ts";
import estilos from "../panel.module.css";

type Props = { previstoId: number; restanteCentimos: number; hoy: string; esCobro: boolean };

// Por defecto confirma lo que falta, con fecha de hoy; se puede ajustar antes
// de guardar (Disney que cobró unos soles más, un pago en partes).
export function ConfirmarPrevisto({ previstoId, restanteCentimos, hoy, esCobro }: Props) {
  const [resultado, accion, guardando] = useActionState(confirmarPrevisto.bind(null, previstoId), null);
  const prefijo = `confirmar-${previstoId}`;

  return (
    <form action={accion} className={estilos.formularioConfirmar}>
      <div className={estilos.campoEdicion}>
        <label htmlFor={`${prefijo}-monto`}>{esCobro ? "Recibiste (S/)" : "Pagaste (S/)"}</label>
        <input
          id={`${prefijo}-monto`}
          name="monto"
          inputMode="decimal"
          required
          defaultValue={formatearCifra(restanteCentimos)}
          className={estilos.selector}
        />
      </div>
      <div className={estilos.campoEdicion}>
        <label htmlFor={`${prefijo}-fecha`}>Fecha</label>
        <input id={`${prefijo}-fecha`} name="fecha" type="date" required defaultValue={hoy} max={hoy} className={estilos.selector} />
      </div>
      <div className={estilos.pieEdicion}>
        <button type="submit" disabled={guardando} className={estilos.boton}>
          {guardando ? "Guardando…" : "Confirmar"}
        </button>
        <p role="status" className={resultado?.ok === false ? estilos.mensajeError : estilos.mensajeOk}>
          {resultado?.mensaje}
        </p>
      </div>
    </form>
  );
}
