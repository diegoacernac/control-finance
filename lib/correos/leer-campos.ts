// Los correos del banco son tablas "etiqueta | valor". Al pasarlos a texto, el
// valor queda en la misma línea ("Monto: S/. 19.30") o en las siguientes
// ("Fecha y hora" / "02 Oct 2026" / "9:35 PM"). Se leen pares etiqueta → líneas
// de valor sin depender del orden ni de la plantilla.

// Un valor no ocupa más de tres líneas; así el pie del correo no se pega al
// último campo.
const LINEAS_MAXIMAS_POR_VALOR = 3;

const VARIANTES_DE_LETRA: Record<string, string> = {
  a: "[aáà]",
  e: "[eéè]",
  i: "[ií]",
  o: "[oó]",
  u: "[uúü]",
  n: "[nñ]",
};

export type CamposCorreo = Map<string, string[]>;

// etiquetas: en minúsculas y sin tildes ("codigo de operacion").
export function leerCampos(texto: string, etiquetas: string[]): CamposCorreo {
  const patrones = [...etiquetas]
    .sort((a, b) => b.length - a.length)
    .map((etiqueta) => ({ etiqueta, patron: patronDeEtiqueta(etiqueta) }));

  const campos: CamposCorreo = new Map();
  let actual: { etiqueta: string; lineas: string[] } | null = null;

  for (const linea of lineasDeTexto(texto)) {
    const encabezado = separarEtiqueta(linea, patrones);
    if (encabezado) {
      actual = guardarSiEsNueva(campos, encabezado.etiqueta, encabezado.resto);
      continue;
    }
    if (!actual) continue;

    actual.lineas.push(linea);
    if (actual.lineas.length >= LINEAS_MAXIMAS_POR_VALOR) actual = null;
  }

  return campos;
}

function lineasDeTexto(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// La primera aparición manda: el pie del correo puede repetir palabras como "Fecha".
function guardarSiEsNueva(campos: CamposCorreo, etiqueta: string, resto: string) {
  if (campos.has(etiqueta)) return null;
  const lineas = resto ? [resto] : [];
  campos.set(etiqueta, lineas);
  return { etiqueta, lineas };
}

function separarEtiqueta(linea: string, patrones: { etiqueta: string; patron: RegExp }[]) {
  for (const { etiqueta, patron } of patrones) {
    const coincidencia = linea.match(patron);
    if (coincidencia) return { etiqueta, resto: coincidencia[1].trim() };
  }
  return null;
}

// "codigo de operacion" → acepta "Código de operación:", "CODIGO DE OPERACION 123".
// Tras la etiqueta debe venir ":", un espacio o el fin de línea, para que
// "Destino" no coincida con "Destinatario".
function patronDeEtiqueta(etiqueta: string): RegExp {
  const cuerpo = etiqueta
    .split(" ")
    .map((palabra) => [...palabra].map((letra) => VARIANTES_DE_LETRA[letra] ?? escapar(letra)).join(""))
    .join("\\s+");
  return new RegExp(`^${cuerpo}(?:\\s*:\\s*|\\s+|$)(.*)$`, "iu");
}

function escapar(letra: string): string {
  return letra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
