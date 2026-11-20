import Link from "next/link";
import { connection } from "next/server";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { fechaEnLima, finDeMes } from "@/lib/fechas/lima.ts";
import { cargarPlanificacion } from "@/lib/planificar/cargar-planificacion.ts";
import { cuotasQueTerminan, planeadosPendientes, previstosDelRango, totalesPorCategoria } from "@/lib/planificar/lista-del-rango.ts";
import { proyectarMeses } from "@/lib/planificar/proyectar-meses.ts";
import { leerRango } from "@/lib/planificar/rango.ts";
import estilosPanel from "../panel.module.css";
import { AjustesPlan } from "./_componentes/AjustesPlan.tsx";
import { CuotasQueTerminan } from "./_componentes/CuotasQueTerminan.tsx";
import { ListaDelRango } from "./_componentes/ListaDelRango.tsx";
import { Planeados } from "./_componentes/Planeados.tsx";
import { ResumenPlan } from "./_componentes/ResumenPlan.tsx";
import { SelectorRango } from "./_componentes/SelectorRango.tsx";
import { TablaMeses } from "./_componentes/TablaMeses.tsx";
import { TotalesPorCategoria } from "./_componentes/TotalesPorCategoria.tsx";
import estilos from "./planificar.module.css";

// Lee el rango de la URL; el permiso del layout no cubre los datos de la URL.
export const instant = false;

export default async function PaginaPlanificar({ searchParams }: PageProps<"/planificar">) {
  await connection();
  await exigirPropietario();

  const hoy = fechaEnLima(new Date());
  const rango = leerRango(await searchParams, hoy);
  // La proyección siempre cubre el mes actual: el siguiente parte de su cierre.
  const hasta = rango.hasta < finDeMes(hoy) ? finDeMes(hoy) : rango.hasta;
  const datos = await cargarPlanificacion(hoy, hasta);

  const meses = proyectarMeses({
    hoy,
    hasta,
    saldoCentimos: datos.saldoCentimos,
    previstos: datos.previstos,
    gastoVariableMensualCentimos: datos.gastoVariableMensualCentimos,
    gastoVariableDelMesCentimos: datos.gastoVariableDelMesCentimos,
  });
  const grupos = previstosDelRango(datos.previstos, rango);

  return (
    <main className={estilos.pagina}>
      <header className={estilosPanel.cabecera}>
        <div>
          <h1 className={estilosPanel.marca}>Planificar</h1>
          <p className={estilosPanel.fechaHoy}>Lo que viene, mes a mes</p>
        </div>
        <Link href="/" className={estilosPanel.botonTexto}>
          Volver al panel
        </Link>
      </header>

      <SelectorRango rango={rango} hoy={hoy} />

      <div className={estilos.vistaGeneral}>
        <ResumenPlan meses={meses} />
        <TablaMeses meses={meses} />
      </div>

      <div className={estilos.columnaPrincipal}>
        <ListaDelRango grupos={grupos} tipo={rango.tipo} />
      </div>

      <div className={estilos.columnaLateral}>
        <TotalesPorCategoria totales={totalesPorCategoria(grupos)} />
        <CuotasQueTerminan cuotas={cuotasQueTerminan(datos.previstos, hoy, hasta)} />
        <Planeados planeados={planeadosPendientes(datos.previstos)} categorias={datos.categorias} hoy={hoy} />
        <AjustesPlan
          ahorroMensual={datos.ahorroMensual}
          gastoVariableMensualCentimos={datos.gastoVariableMensualCentimos}
          gastoVariableDelMesCentimos={datos.gastoVariableDelMesCentimos}
        />
      </div>
    </main>
  );
}
