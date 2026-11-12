const ZONA_LIMA = "America/Lima";
const MS_POR_DIA = 86_400_000;

const formatoFechaLima = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_LIMA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// El servidor (Vercel) corre en UTC; sin esto, un gasto a las 9 p. m. en Lima
// quedaría con la fecha del día siguiente.
export function fechaEnLima(instante: Date): string {
  return formatoFechaLima.format(instante);
}

export function restarDias(fechaIso: string, dias: number): string {
  return sumarDias(fechaIso, -dias);
}

export function sumarDias(fechaIso: string, dias: number): string {
  const base = Date.parse(`${fechaIso}T00:00:00Z`);
  return new Date(base + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

export function inicioDeMes(fechaIso: string): string {
  return `${fechaIso.slice(0, 7)}-01`;
}

export function finDeMes(fechaIso: string): string {
  const [anio, mes] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

export function diaDeSemana(fechaIso: string): number {
  return new Date(`${fechaIso}T00:00:00Z`).getUTCDay();
}

const PATRON_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esFechaIsoValida(texto: string): boolean {
  const partes = texto.match(PATRON_FECHA_ISO);
  if (!partes) return false;
  return construirFechaIso(Number(partes[1]), Number(partes[2]), Number(partes[3])) === texto;
}

export function construirFechaIso(anio: number, mes: number, dia: number): string | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const esValida =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return esValida ? fecha.toISOString().slice(0, 10) : null;
}
