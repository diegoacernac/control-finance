"use client";

import { useActionState } from "react";
import { LARGO_MAXIMO_TEXTO } from "@/lib/movimientos/limites.ts";
import { registrarDesdeWeb } from "../acciones.ts";
import estilos from "../panel.module.css";

export function RegistroRapido() {
  const [resultado, accion, enviando] = useActionState(registrarDesdeWeb, null);

  return (
    <section aria-labelledby="titulo-registro" className={estilos.registro}>
      <h2 id="titulo-registro" className={estilos.soloLectores}>
        Registrar un movimiento
      </h2>
      <form action={accion} className={estilos.registroFormulario}>
        <label htmlFor="texto-registro" className={estilos.soloLectores}>
          Movimiento
        </label>
        <input
          id="texto-registro"
          name="texto"
          required
          maxLength={LARGO_MAXIMO_TEXTO}
          autoComplete="off"
          placeholder="taxi oficina 12.50 · mi madre me pagó 15"
          className={estilos.registroCampo}
        />
        <button type="submit" disabled={enviando} className={estilos.boton}>
          {enviando ? "Anotando…" : "Anotar"}
        </button>
      </form>
      <p role="status" className={resultado?.ok === false ? estilos.mensajeError : estilos.mensajeOk}>
        {resultado?.mensaje}
      </p>
    </section>
  );
}
