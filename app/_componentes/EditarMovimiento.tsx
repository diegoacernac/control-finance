"use client";

import { useActionState } from "react";
import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import { LARGO_MAXIMO_TEXTO } from "@/lib/movimientos/limites.ts";
import type { MovimientoPanel, OpcionCategoria, PrevistoPanel } from "@/lib/panel/tipos.ts";
import { editarMovimiento } from "../acciones.ts";
import estilos from "../panel.module.css";
import { SelectorDestino } from "./SelectorDestino.tsx";

type Props = {
  movimiento: MovimientoPanel;
  previstosAbiertos: PrevistoPanel[];
  categorias: OpcionCategoria[];
};

export function EditarMovimiento({ movimiento, previstosAbiertos, categorias }: Props) {
  const [resultado, accion, guardando] = useActionState(editarMovimiento.bind(null, movimiento.id), null);
  const prefijo = `editar-${movimiento.id}`;
  const actual = movimiento.previstoNombre ?? movimiento.categoriaNombre ?? "sin categoría";

  return (
    <form action={accion} className={estilos.formularioEdicion}>
      <div className={estilos.campoEdicion}>
        <label htmlFor={`${prefijo}-monto`}>Monto ({movimiento.moneda === "PEN" ? "S/" : "US$"})</label>
        <input
          id={`${prefijo}-monto`}
          name="monto"
          inputMode="decimal"
          required
          defaultValue={formatearCifra(movimiento.montoCentimos)}
          className={estilos.selector}
        />
      </div>
      <div className={estilos.campoEdicion}>
        <label htmlFor={`${prefijo}-fecha`}>Fecha</label>
        <input id={`${prefijo}-fecha`} name="fecha" type="date" required defaultValue={movimiento.fecha} className={estilos.selector} />
      </div>
      <div className={`${estilos.campoEdicion} ${estilos.campoAncho}`}>
        <label htmlFor={`${prefijo}-descripcion`}>Descripción</label>
        <input
          id={`${prefijo}-descripcion`}
          name="descripcion"
          required
          maxLength={LARGO_MAXIMO_TEXTO}
          defaultValue={movimiento.descripcion}
          className={estilos.selector}
        />
      </div>
      <div className={`${estilos.campoEdicion} ${estilos.campoAncho}`}>
        <label htmlFor={`${prefijo}-destino`}>Corresponde a</label>
        <SelectorDestino
          id={`${prefijo}-destino`}
          tipo={movimiento.tipo}
          moneda={movimiento.moneda}
          previstosAbiertos={previstosAbiertos}
          categorias={categorias}
          opcionVacia={{ texto: `Mantener: ${actual}`, obligatoria: false }}
        />
      </div>

      <div className={estilos.pieEdicion}>
        <button type="submit" disabled={guardando} className={estilos.boton}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        <p role="status" className={resultado?.ok === false ? estilos.mensajeError : estilos.mensajeOk}>
          {resultado?.mensaje}
        </p>
      </div>
    </form>
  );
}
