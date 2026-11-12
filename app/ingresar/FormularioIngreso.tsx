"use client";

import { useActionState } from "react";
import { enviarEnlace } from "./acciones.ts";
import estilos from "./ingresar.module.css";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState(enviarEnlace, null);

  return (
    <form action={accion} className={estilos.formulario}>
      <label htmlFor="correo">Tu correo</label>
      <input
        id="correo"
        name="correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="nombre@correo.com"
        className={estilos.campo}
      />
      <button type="submit" disabled={enviando} className={estilos.boton}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </button>

      <p role="status" className={estado?.esError ? estilos.mensajeError : estilos.mensaje}>
        {estado?.mensaje}
      </p>
    </form>
  );
}
