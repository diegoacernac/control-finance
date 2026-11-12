import type { Moneda, TipoMovimiento } from "./tipos.ts";

const CENTIMOS_POR_UNIDAD = 100;
const SIGNO_MENOS = "−";

const formatoCifra = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatearMonto(centimos: number, moneda: Moneda): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(centimos / CENTIMOS_POR_UNIDAD);
}

// Sin símbolo de moneda, para columnas donde la moneda ya se dijo una vez.
export function formatearCifra(centimos: number): string {
  return formatoCifra.format(centimos / CENTIMOS_POR_UNIDAD);
}

export function formatearConSigno(tipo: TipoMovimiento, centimos: number): string {
  return `${tipo === "ingreso" ? "+" : SIGNO_MENOS} ${formatearCifra(centimos)}`;
}

// Separa "2,275" de "09" para dar distinto tamaño a enteros y decimales.
export function partesDeCifra(centimos: number): { negativo: boolean; entero: string; decimales: string } {
  const [entero, decimales] = formatearCifra(Math.abs(centimos)).split(".");
  return { negativo: centimos < 0, entero, decimales };
}
