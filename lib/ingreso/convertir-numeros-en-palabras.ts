import { normalizarParaComparar } from "../texto/normalizar.ts";

// Siri transcribe "quince soles" o "doce con cincuenta" en letras; esto lo
// convierte a "15 soles" y "12.50" antes de buscar el monto.

const VALOR_POR_PALABRA: Record<string, number> = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

// "un"/"una" casi siempre son artículos ("un taxi"); solo son número dentro de
// una cifra ("ciento un") o antes de "mil" o de una moneda ("un sol").
const ARTICULOS = new Set(["un", "una"]);
const PALABRAS_QUE_HACEN_NUMERO_AL_ARTICULO = new Set(["mil", "sol", "soles", "dolar", "dolares"]);
const MIL = 1000;
const CENTIMOS_POR_UNIDAD = 100;

type Lectura = { valor: number; siguiente: number };

export function convertirNumerosEnPalabras(texto: string): string {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const resultado: string[] = [];

  let indice = 0;
  while (indice < palabras.length) {
    const entero = leerEntero(palabras, indice);
    if (!entero) {
      resultado.push(palabras[indice]);
      indice += 1;
      continue;
    }

    const centimos = leerCentimos(palabras, entero.siguiente);
    resultado.push(centimos ? `${entero.valor}.${String(centimos.valor).padStart(2, "0")}` : String(entero.valor));
    indice = centimos?.siguiente ?? entero.siguiente;
  }

  return resultado.join(" ");
}

// "doce con cincuenta" → 50 céntimos.
function leerCentimos(palabras: string[], inicio: number): Lectura | null {
  if (normalizarParaComparar(palabras[inicio] ?? "") !== "con") return null;
  const centimos = leerEntero(palabras, inicio + 1);
  return centimos && centimos.valor < CENTIMOS_POR_UNIDAD ? centimos : null;
}

function leerEntero(palabras: string[], inicio: number): Lectura | null {
  let total = 0;
  let grupo = 0;
  let ultimoValor: number | null = null;
  let indice = inicio;

  while (indice < palabras.length) {
    const palabra = normalizarParaComparar(palabras[indice]);

    if (palabra === "mil") {
      total += (grupo || 1) * MIL;
      grupo = 0;
      ultimoValor = null;
      indice += 1;
      continue;
    }

    if (palabra === "y" && esDecenaExacta(ultimoValor) && esUnidad(palabras[indice + 1])) {
      indice += 1;
      continue;
    }

    const valor = valorDePalabra(palabra, ultimoValor !== null || total > 0, palabras[indice + 1]);
    if (valor === null || !puedeSeguir(ultimoValor, valor)) break;

    grupo += valor;
    ultimoValor = valor;
    indice += 1;
  }

  return indice > inicio ? { valor: total + grupo, siguiente: indice } : null;
}

function valorDePalabra(palabra: string, dentroDeCifra: boolean, siguiente: string | undefined): number | null {
  if (ARTICULOS.has(palabra)) {
    const antesDeMilOMoneda = PALABRAS_QUE_HACEN_NUMERO_AL_ARTICULO.has(normalizarParaComparar(siguiente ?? ""));
    return dentroDeCifra || antesDeMilOMoneda ? 1 : null;
  }
  return VALOR_POR_PALABRA[palabra] ?? null;
}

// Evita sumar palabras sueltas que no forman una cifra: "dos tres" no es 5.
// Tras una centena puede venir cualquier cosa menor; tras una decena exacta
// (veinte, treinta…), solo una unidad.
function puedeSeguir(ultimoValor: number | null, valor: number): boolean {
  if (ultimoValor === null) return true;
  if (ultimoValor >= 100) return valor < 100;
  return esDecenaExacta(ultimoValor) && valor < 10;
}

function esDecenaExacta(valor: number | null): boolean {
  return valor !== null && valor >= 20 && valor < 100 && valor % 10 === 0;
}

function esUnidad(palabra: string | undefined): boolean {
  const normalizada = normalizarParaComparar(palabra ?? "");
  if (ARTICULOS.has(normalizada)) return true;
  const valor = VALOR_POR_PALABRA[normalizada];
  return valor !== undefined && valor >= 1 && valor <= 9;
}
