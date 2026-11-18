"use client";

import { useActionState, useState } from "react";
import { LARGO_MAXIMO_TEXTO } from "@/lib/movimientos/limites.ts";
import { registrarDesdeWeb } from "../acciones.ts";
import estilos from "../panel.module.css";
import { FormularioPrestamo } from "./FormularioPrestamo.tsx";

type TipoRegistro = "pago" | "cobro" | "prestamo";

const OPCIONES: { valor: TipoRegistro; etiqueta: string }[] = [
  { valor: "pago", etiqueta: "Pago" },
  { valor: "cobro", etiqueta: "Cobro" },
  { valor: "prestamo", etiqueta: "Préstamo" },
];

const EJEMPLO: Record<Exclude<TipoRegistro, "prestamo">, string> = {
  pago: "taxi oficina 12.50 · hbo 26.90",
  cobro: "mi madre me pagó 15 · gaby 130",
};

export function RegistroRapido({ hoy }: { hoy: string }) {
  const [tipo, setTipo] = useState<TipoRegistro>("pago");

  return (
    <section aria-labelledby="titulo-registro" className={estilos.registro}>
      <h2 id="titulo-registro" className={estilos.soloLectores}>
        Registrar un movimiento
      </h2>

      <div role="radiogroup" aria-label="Tipo de movimiento" className={estilos.tiposRegistro}>
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={tipo === opcion.valor}
            onClick={() => setTipo(opcion.valor)}
            className={estilos.opcionTema}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {tipo === "prestamo" ? <FormularioPrestamo hoy={hoy} /> : <FormularioMovimiento tipo={tipo} />}
    </section>
  );
}

function FormularioMovimiento({ tipo }: { tipo: "pago" | "cobro" }) {
  const [resultado, accion, enviando] = useActionState(registrarDesdeWeb, null);

  return (
    <>
      <form action={accion} className={estilos.registroFormulario}>
        <input type="hidden" name="tipo" value={tipo} />
        <label htmlFor="texto-registro" className={estilos.soloLectores}>
          {tipo === "pago" ? "Qué pagaste" : "Qué cobraste"}
        </label>
        <input
          id="texto-registro"
          name="texto"
          required
          maxLength={LARGO_MAXIMO_TEXTO}
          autoComplete="off"
          placeholder={EJEMPLO[tipo]}
          className={estilos.registroCampo}
        />
        <button type="submit" disabled={enviando} className={estilos.boton}>
          {enviando ? "Anotando…" : "Anotar"}
        </button>
      </form>
      <p role="status" className={resultado?.ok === false ? estilos.mensajeError : estilos.mensajeOk}>
        {resultado?.mensaje}
      </p>
    </>
  );
}
