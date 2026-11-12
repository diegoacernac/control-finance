import { connection } from "next/server";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { fechaLarga, nombreDelMes } from "@/lib/fechas/formato.ts";
import { fechaEnLima, finDeMes } from "@/lib/fechas/lima.ts";
import { agruparPrevistos } from "@/lib/panel/agrupar-previstos.ts";
import { construirCalendario } from "@/lib/panel/calendario.ts";
import { cargarPanel } from "@/lib/panel/cargar-panel.ts";
import { calcularGastoDelMes } from "@/lib/panel/gasto-por-categoria.ts";
import { calcularProyeccion, estaAbierto } from "@/lib/panel/proyeccion.ts";
import { leerTema } from "@/lib/tema.ts";
import { CalendarioMes } from "./_componentes/CalendarioMes.tsx";
import { GastoPorCategoria } from "./_componentes/GastoPorCategoria.tsx";
import { PorRevisar } from "./_componentes/PorRevisar.tsx";
import { PrevistosDelMes } from "./_componentes/PrevistosDelMes.tsx";
import { RegistroRapido } from "./_componentes/RegistroRapido.tsx";
import { ResumenMes } from "./_componentes/ResumenMes.tsx";
import { SelectorTema } from "./_componentes/SelectorTema.tsx";
import { UltimosMovimientos } from "./_componentes/UltimosMovimientos.tsx";
import { cerrarSesion } from "./ingresar/acciones.ts";
import estilos from "./panel.module.css";

export default async function PaginaPanel() {
  await exigirPropietario();

  // "Hoy" cambia en cada visita: se calcula al momento del pedido, nunca de antemano.
  await connection();
  const hoy = fechaEnLima(new Date());
  const fin = finDeMes(hoy);
  const datos = await cargarPanel(hoy);
  const saldoTotal = datos.saldos.reduce((suma, cuenta) => suma + cuenta.saldoCentimos, 0);
  const previstosAbiertos = datos.previstos.filter(estaAbierto);

  return (
    <main className={estilos.panel}>
      <header className={estilos.cabecera}>
        <div>
          <h1 className={estilos.marca}>Finanzas</h1>
          <p className={estilos.fechaHoy}>{fechaLarga(hoy)}</p>
        </div>
        <div className={estilos.acciones}>
          <SelectorTema actual={await leerTema()} />
          <form action={cerrarSesion}>
            <button type="submit" className={estilos.botonTexto}>
              Salir
            </button>
          </form>
        </div>
      </header>

      <RegistroRapido />

      <div className={`${estilos.columna} ${estilos.columnaFija}`}>
        <ResumenMes
          mes={nombreDelMes(hoy)}
          proyeccion={calcularProyeccion(saldoTotal, datos.previstos, fin)}
          saldos={datos.saldos}
        />
        <CalendarioMes calendario={construirCalendario(datos.previstos, hoy)} />
      </div>

      <div className={estilos.columna}>
        <PorRevisar
          movimientos={datos.porRevisar}
          previstosAbiertos={previstosAbiertos}
          categorias={datos.categorias}
        />
        <PrevistosDelMes grupos={agruparPrevistos(datos.previstos, hoy, fin)} />
        <GastoPorCategoria gasto={calcularGastoDelMes(datos.movimientosDelMes)} />
        <UltimosMovimientos
          movimientos={datos.ultimosMovimientos}
          previstosAbiertos={previstosAbiertos}
          categorias={datos.categorias}
        />
      </div>
    </main>
  );
}
