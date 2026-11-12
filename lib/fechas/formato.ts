const formatoDiaYMes = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });
const formatoMes = new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" });
const formatoFechaLarga = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// Las fechas de negocio son días sin hora ("2026-11-11"); se formatean en UTC
// para que el huso del servidor no las corra un día.
function comoFecha(fechaIso: string): Date {
  return new Date(`${fechaIso}T00:00:00Z`);
}

export function diaYMes(fechaIso: string): string {
  return formatoDiaYMes.format(comoFecha(fechaIso)).replace(".", "");
}

export function nombreDelMes(fechaIso: string): string {
  return formatoMes.format(comoFecha(fechaIso)).toLowerCase();
}

export function fechaLarga(fechaIso: string): string {
  return formatoFechaLarga.format(comoFecha(fechaIso));
}
