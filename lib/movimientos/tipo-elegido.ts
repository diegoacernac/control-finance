import type { TipoMovimiento } from "./tipos.ts";

// Lo que se elige en el menú del atajo o en la web. Sin elección (null), el
// tipo se deduce del texto como siempre.
const TIPO_POR_ELECCION: Record<string, TipoMovimiento> = { pago: "egreso", cobro: "ingreso" };

export type LecturaTipoElegido = { valido: true; tipo: TipoMovimiento | null } | { valido: false };

export function leerTipoElegido(valor: unknown): LecturaTipoElegido {
  if (valor === undefined || valor === null || valor === "") return { valido: true, tipo: null };
  if (typeof valor !== "string") return { valido: false };

  const tipo = TIPO_POR_ELECCION[valor.trim().toLowerCase()];
  return tipo ? { valido: true, tipo } : { valido: false };
}
