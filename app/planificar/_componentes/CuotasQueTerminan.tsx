import { diaYMes } from "@/lib/fechas/formato.ts";
import { formatearCifra } from "@/lib/movimientos/formato-monto.ts";
import type { PrevistoPlan } from "@/lib/planificar/tipos.ts";
import estilosPanel from "../../panel.module.css";
import estilos from "../planificar.module.css";

export function CuotasQueTerminan({ cuotas }: { cuotas: PrevistoPlan[] }) {
  if (cuotas.length === 0) return null;

  return (
    <section aria-labelledby="titulo-cuotas">
      <h2 id="titulo-cuotas" className={estilos.titulo}>
        Cuotas que terminan
      </h2>
      <ul className={estilosPanel.lista}>
        {cuotas.map((cuota) => (
          <li key={cuota.id} className={estilos.filaSimple}>
            <span>
              {cuota.nombre}
              <span className={estilos.detalleSimple}>
                última {diaYMes(cuota.fechaEsperada!)} · {cuota.tipo === "egreso" ? "dejas de pagar" : "dejas de cobrar"}
              </span>
            </span>
            <span className={estilosPanel.cifra}>{formatearCifra(cuota.montoEsperadoCentimos)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
