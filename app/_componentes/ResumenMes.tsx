import { formatearCifra, formatearMonto, partesDeCifra } from "@/lib/movimientos/formato-monto.ts";
import type { Proyeccion } from "@/lib/panel/proyeccion.ts";
import type { SaldoCuenta } from "@/lib/panel/tipos.ts";
import estilos from "../panel.module.css";

type Props = { mes: string; proyeccion: Proyeccion; saldos: SaldoCuenta[] };

export function ResumenMes({ mes, proyeccion, saldos }: Props) {
  const cierre = partesDeCifra(proyeccion.cierreCentimos);

  return (
    <section className={estilos.resumen} aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen" className={estilos.resumenEtiqueta}>
        Cierras {mes} con
      </h2>
      <p className={estilos.resumenCifra}>
        {cierre.negativo && <span aria-label="menos">−</span>}
        <span className={estilos.resumenMoneda}>S/</span>
        {cierre.entero}
        <span className={estilos.resumenDecimales}>.{cierre.decimales}</span>
      </p>

      <p className={estilos.resumenHoy}>Hoy tienes {formatearMonto(proyeccion.saldoCentimos, "PEN")}</p>
      <ul className={estilos.cuentas}>
        {saldos.map((cuenta) => (
          <li key={cuenta.id}>
            <span>{cuenta.nombre}</span>
            <span className={estilos.cifra}>{formatearCifra(cuenta.saldoCentimos)}</span>
          </li>
        ))}
      </ul>

      <dl className={estilos.par}>
        <div>
          <dt>Falta cobrar</dt>
          <dd className={estilos.parIngreso}>+ {formatearCifra(proyeccion.porCobrarCentimos)}</dd>
        </div>
        <div>
          <dt>Falta pagar</dt>
          <dd className={estilos.parEgreso}>− {formatearCifra(proyeccion.porPagarCentimos)}</dd>
        </div>
      </dl>
    </section>
  );
}
