// Los correos de Interbank son tablas HTML. Cada celda, fila o bloque pasa a
// ser una línea, que es lo que leerCampos espera: "Código de operación" en una
// línea y "95116718" en la siguiente.

const BLOQUES_INVISIBLES = /<(head|style|script|title)\b[^>]*>[\s\S]*?<\/\1>/gi;
const COMENTARIOS = /<!--[\s\S]*?-->/g;
const FIN_DE_BLOQUE = /<\s*(br|\/p|\/div|\/tr|\/td|\/th|\/li|\/h[1-6]|\/table)\b[^>]*>/gi;
const ETIQUETAS = /<[^>]+>/g;
const ENTIDAD = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;

const ENTIDADES_CON_NOMBRE: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
  iquest: "¿", iexcl: "¡", deg: "°",
};

export function htmlATexto(html: string): string {
  return html
    .replace(BLOQUES_INVISIBLES, " ")
    .replace(COMENTARIOS, " ")
    .replace(FIN_DE_BLOQUE, "\n")
    .replace(ETIQUETAS, " ")
    .replace(ENTIDAD, decodificarEntidad);
}

function decodificarEntidad(entidad: string, codigo: string): string {
  if (codigo.startsWith("#x") || codigo.startsWith("#X")) return caracter(Number.parseInt(codigo.slice(2), 16), entidad);
  if (codigo.startsWith("#")) return caracter(Number.parseInt(codigo.slice(1), 10), entidad);
  return ENTIDADES_CON_NOMBRE[codigo] ?? entidad;
}

function caracter(puntoDeCodigo: number, original: string): string {
  const valido = Number.isInteger(puntoDeCodigo) && puntoDeCodigo > 0 && puntoDeCodigo <= 0x10ffff;
  return valido ? String.fromCodePoint(puntoDeCodigo) : original;
}
