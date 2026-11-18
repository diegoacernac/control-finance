const POSESIVOS = new Set(["mi", "mis", "tu", "tus"]);

// "mi madre" → "Madre", "juan carlos" → "Juan Carlos": el posesivo no es parte
// del nombre y las mayúsculas no deben depender de cómo transcribió Siri.
export function formatearNombre(nombre: string | undefined): string | null {
  const palabras = nombre?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (palabras.length > 1 && POSESIVOS.has(palabras[0].toLowerCase())) palabras.shift();
  if (palabras.length === 0) return null;
  return palabras.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}
