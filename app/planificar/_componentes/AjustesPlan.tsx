"use client";

import { useActionState } from "react";
import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import type { AhorroMensual } from "@/lib/planificar/cargar-planificacion.ts";
import estilosPanel from "../../panel.module.css";
import { guardarAhorro, guardarGastoVariable } from "../acciones.ts";
import estilos from "../planificar.module.css";

type Props = {
  ahorroMensual: AhorroMensual;
  gastoVariableMensualCentimos: number;
  gastoVariableDelMesCentimos: number;
};

const DIA_DE_AHORRO_SUGERIDO = 5;

export function AjustesPlan({ ahorroMensual, gastoVariableMensualCentimos, gastoVariableDelMesCentimos }: Props) {
  const [resultadoAhorro, accionAhorro, guardandoAhorro] = useActionState(guardarAhorro, null);
  const [resultadoVariable, accionVariable, guardandoVariable] = useActionState(guardarGastoVariable, null);

  return (
    <section aria-labelledby="titulo-ajustes">
      <h2 id="titulo-ajustes" className={estilos.titulo}>
        Supuestos
      </h2>

      <h3 className={estilosPanel.subtitulo}>Ahorro mensual</h3>
      <p className={estilos.ayuda}>
        Sale del saldo pero no cuenta como gasto. Confírmalo cuando muevas la plata a la alcancía. 0 para dejar de
        ahorrar.
      </p>
      <form action={accionAhorro} className={estilosPanel.formularioEdicion}>
        <div className={estilosPanel.campoEdicion}>
          <label htmlFor="ahorro-monto">Monto (S/)</label>
          <input
            id="ahorro-monto"
            name="monto"
            required
            inputMode="decimal"
            defaultValue={ahorroMensual ? formatearCifra(ahorroMensual.montoCentimos) : ""}
            placeholder="300"
            className={estilosPanel.selector}
          />
        </div>
        <div className={estilosPanel.campoEdicion}>
          <label htmlFor="ahorro-dia">Día del mes</label>
          <input
            id="ahorro-dia"
            name="dia"
            type="number"
            required
            min={1}
            max={31}
            defaultValue={ahorroMensual?.dia ?? DIA_DE_AHORRO_SUGERIDO}
            className={estilosPanel.selector}
          />
        </div>
        <Pie enviando={guardandoAhorro} resultado={resultadoAhorro} />
      </form>

      <h3 className={estilosPanel.subtitulo}>Gasto variable</h3>
      <p className={estilos.ayuda}>
        Comida, taxis e imprevistos: lo que no es fijo. Este mes llevas {formatearCifra(gastoVariableDelMesCentimos)}.
      </p>
      <form action={accionVariable} className={estilosPanel.formularioEdicion}>
        <div className={estilosPanel.campoEdicion}>
          <label htmlFor="variable-monto">Al mes (S/)</label>
          <input
            id="variable-monto"
            name="monto"
            required
            inputMode="decimal"
            defaultValue={formatearCifra(gastoVariableMensualCentimos)}
            className={estilosPanel.selector}
          />
        </div>
        <Pie enviando={guardandoVariable} resultado={resultadoVariable} />
      </form>
    </section>
  );
}

function Pie({ enviando, resultado }: { enviando: boolean; resultado: { ok: boolean; mensaje: string } | null }) {
  return (
    <div className={estilosPanel.pieEdicion}>
      <button type="submit" disabled={enviando} className={estilosPanel.boton}>
        {enviando ? "Guardando…" : "Guardar"}
      </button>
      <p role="status" className={resultado?.ok === false ? estilosPanel.mensajeError : estilosPanel.mensajeOk}>
        {resultado?.mensaje}
      </p>
    </div>
  );
}
