import { esFechaIsoValida, finDeMes, inicioDeMes, mesDespues } from "../fechas/lima.ts";
import type { FiltroTipo } from "./tipos.ts";

export type Vista = "siguiente" | "3m" | "6m" | "fechas";

export type RangoPlan = {
  vista: Vista;
  desde: string;
  hasta: string;
  tipo: FiltroTipo;
  aviso: string | null;
};

type ParametrosUrl = Record<string, string | string[] | undefined>;

// Hasta un año: generar previstos más lejos no ayuda a planear y llena la base.
export const MESES_MAXIMOS = 12;
const VISTA_POR_DEFECTO: Exclude<Vista, "fechas"> = "3m";

// Lee ?ver=siguiente|3m|6m|fechas&desde=&hasta=&tipo=ingreso|egreso de la URL.
// Lo que no es válido cae en la vista por defecto, con un aviso.
export function leerRango(parametros: ParametrosUrl, hoy: string): RangoPlan {
  const tipo = leerTipo(unico(parametros.tipo));
  const vista = unico(parametros.ver);

  if (vista === "fechas") {
    const desde = unico(parametros.desde) ?? "";
    const hasta = unico(parametros.hasta) ?? "";
    if (fechasValidas(desde, hasta, hoy)) return { vista, desde, hasta, tipo, aviso: null };

    const limite = limiteDelHorizonte(hoy);
    const aviso = `Elige un rango entre ${inicioDeMes(hoy)} y ${limite}, con el inicio antes del fin.`;
    return { ...rangoPredefinido(VISTA_POR_DEFECTO, hoy), tipo, aviso };
  }

  const predefinida: Exclude<Vista, "fechas"> =
    vista === "siguiente" || vista === "3m" || vista === "6m" ? vista : VISTA_POR_DEFECTO;
  return { ...rangoPredefinido(predefinida, hoy), tipo, aviso: null };
}

export function limiteDelHorizonte(hoy: string): string {
  return finDeMes(mesDespues(hoy, MESES_MAXIMOS - 1));
}

function rangoPredefinido(vista: Exclude<Vista, "fechas">, hoy: string): Pick<RangoPlan, "vista" | "desde" | "hasta"> {
  if (vista === "siguiente") {
    const mesSiguiente = mesDespues(hoy, 1);
    return { vista, desde: mesSiguiente, hasta: finDeMes(mesSiguiente) };
  }
  const meses = vista === "3m" ? 3 : 6;
  return { vista, desde: hoy, hasta: finDeMes(mesDespues(hoy, meses - 1)) };
}

function fechasValidas(desde: string, hasta: string, hoy: string): boolean {
  if (!esFechaIsoValida(desde) || !esFechaIsoValida(hasta)) return false;
  return desde <= hasta && desde >= inicioDeMes(hoy) && hasta <= limiteDelHorizonte(hoy);
}

function leerTipo(valor: string | undefined): FiltroTipo {
  return valor === "ingreso" || valor === "egreso" ? valor : "todo";
}

function unico(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
