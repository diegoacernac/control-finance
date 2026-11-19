import { nombreDelMes } from "@/lib/fechas/formato.ts";
import { formatearCifra, formatearMonto, partesDeCifra } from "@/lib/movimientos/formato-monto.ts";
import type { MesProyectado } from "@/lib/planificar/proyectar-meses.ts";
import estilosPanel from "../../panel.module.css";

// La respuesta corta: con cuánto terminas el periodo, cuánto ahorras y cuál es
// el mes en que menos te sobra.
export function ResumenPlan({ meses }: { meses: MesProyectado[] }) {
  const ultimo = meses.at(-1)!;
  const cierre = partesDeCifra(ultimo.cierreCentimos);
  const ahorroTotal = meses.reduce((suma, mes) => suma + mes.ahorroCentimos, 0);
  const masJusto = meses.reduce((peor, mes) => (mes.libreCentimos < peor.libreCentimos ? mes : peor));

  return (
    <section className={estilosPanel.resumen} aria-labelledby="titulo-plan">
      <h2 id="titulo-plan" className={estilosPanel.resumenEtiqueta}>
        Cierras {nombreDelMes(ultimo.mes)} con
      </h2>
      <p className={estilosPanel.resumenCifra}>
        {cierre.negativo && <span aria-label="menos">−</span>}
        <span className={estilosPanel.resumenMoneda}>S/</span>
        {cierre.entero}
        <span className={estilosPanel.resumenDecimales}>.{cierre.decimales}</span>
      </p>
      <p className={estilosPanel.resumenHoy}>Hoy tienes {formatearMonto(meses[0].inicioCentimos, "PEN")}</p>

      <dl className={estilosPanel.par}>
        <div>
          <dt>Ahorras en el periodo</dt>
          <dd className={estilosPanel.parIngreso}>{formatearCifra(ahorroTotal)}</dd>
        </div>
        <div>
          <dt>Mes más justo: {nombreDelMes(masJusto.mes)}</dt>
          <dd className={masJusto.libreCentimos < 0 ? estilosPanel.parEgreso : undefined}>
            {masJusto.libreCentimos < 0 ? "faltan " : "libre "}
            {formatearCifra(Math.abs(masJusto.libreCentimos))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
