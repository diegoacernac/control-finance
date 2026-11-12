import { diaDeSemana, finDeMes, inicioDeMes } from "../fechas/lima.ts";
import { estaAbierto } from "./proyeccion.ts";
import type { PrevistoPanel } from "./tipos.ts";

export type EstadoDia = "sin-pagos" | "resuelto" | "pendiente" | "parcial" | "atrasado";

export type DiaCalendario = {
  dia: number;
  esHoy: boolean;
  estado: EstadoDia;
  nombres: string[];
};

export type CalendarioMes = { espaciosIniciales: number; dias: DiaCalendario[] };

const DIAS_POR_SEMANA = 7;
const DESFASE_LUNES_PRIMERO = 6;

export function construirCalendario(previstos: PrevistoPanel[], hoy: string): CalendarioMes {
  const inicio = inicioDeMes(hoy);
  const cantidadDias = Number(finDeMes(hoy).slice(8));
  const prefijoMes = hoy.slice(0, 8);

  const dias = Array.from({ length: cantidadDias }, (_, indice) => {
    const dia = indice + 1;
    const fecha = `${prefijoMes}${String(dia).padStart(2, "0")}`;
    // Un previsto omitido no es un pago del día: no debe pintar la casilla.
    const delDia = previstos.filter((p) => p.fechaEsperada === fecha && p.estado !== "omitido");
    return { dia, esHoy: fecha === hoy, estado: estadoDelDia(delDia, fecha, hoy), nombres: delDia.map((p) => p.nombre) };
  });

  return { espaciosIniciales: (diaDeSemana(inicio) + DESFASE_LUNES_PRIMERO) % DIAS_POR_SEMANA, dias };
}

// Si en un día queda algo abierto, manda eso: un día con Prime pagado y Uber
// pendiente sigue pendiente.
function estadoDelDia(previstos: PrevistoPanel[], fecha: string, hoy: string): EstadoDia {
  if (previstos.length === 0) return "sin-pagos";

  const abiertos = previstos.filter(estaAbierto);
  if (abiertos.length === 0) return "resuelto";
  if (fecha < hoy) return "atrasado";
  return abiertos.some((p) => p.estado === "parcial") ? "parcial" : "pendiente";
}
