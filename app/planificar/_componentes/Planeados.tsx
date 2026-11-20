import { diaYMes } from "@/lib/fechas/formato.ts";
import { formatearConSigno } from "@/lib/movimientos/formato-monto.ts";
import type { OpcionCategoria } from "@/lib/panel/tipos.ts";
import { restanteCentimos } from "@/lib/planificar/proyectar-meses.ts";
import type { PrevistoPlan } from "@/lib/planificar/tipos.ts";
import estilosPanel from "../../panel.module.css";
import { quitarPlaneado } from "../acciones.ts";
import estilos from "../planificar.module.css";
import { FormularioPlaneado } from "./FormularioPlaneado.tsx";
import { BotonEnviar } from "../../_componentes/BotonEnviar.tsx";

type Props = { planeados: PrevistoPlan[]; categorias: OpcionCategoria[]; hoy: string };

export function Planeados({ planeados, categorias, hoy }: Props) {
  return (
    <section aria-labelledby="titulo-planeados">
      <h2 id="titulo-planeados" className={estilos.titulo}>
        Planeado
      </h2>
      <p className={estilos.ayuda}>
        Compras, viajes o ingresos que aún no pasan. Al registrar el gasto real con su nombre (“viaje cusco pasajes
        800”) se descuenta de aquí.
      </p>

      {planeados.length > 0 && (
        <ul className={estilosPanel.lista}>
          {planeados.map((planeado) => (
            <li key={planeado.id} className={estilosPanel.fila}>
              <span className={estilosPanel.filaFecha}>{diaYMes(planeado.fechaEsperada!)}</span>
              <span className={estilosPanel.filaNombre}>{planeado.nombre}</span>
              <span className={`${estilosPanel.cifra} ${planeado.tipo === "ingreso" ? estilosPanel.ingreso : estilosPanel.egreso}`}>
                {formatearConSigno(planeado.tipo, restanteCentimos(planeado))}
              </span>
              <div className={estilosPanel.filaDetalle}>
                {planeado.categoriaNombre}
                {planeado.pagadoCentimos === 0 && (
                  <details className={estilosPanel.confirmar}>
                    <summary className={estilosPanel.botonTexto}>Quitar</summary>
                    <form action={quitarPlaneado.bind(null, planeado.id)} className={estilosPanel.enLinea}>
                      <BotonEnviar className={estilosPanel.botonPeligro} textoEnviando="Quitando…">
                        Sí, quitar
                      </BotonEnviar>
                    </form>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className={estilosPanel.plegable} open={planeados.length === 0}>
        <summary>Anotar algo planeado</summary>
        <FormularioPlaneado categorias={categorias} hoy={hoy} />
      </details>
    </section>
  );
}
