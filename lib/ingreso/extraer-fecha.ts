import { construirFechaIso, diaDeSemana, restarDias } from "../fechas/lima.ts";
import { normalizarParaComparar } from "../texto/normalizar.ts";

type FechaExtraida = { fecha: string; textoRestante: string };

const DIAS_ATRAS_POR_PALABRA: Record<string, number> = { hoy: 0, ayer: 1, anteayer: 2, antier: 2 };

const NUMERO_DIA_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const PATRON_FECHA_NUMERICA = /(?<![\d/.,])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/;
const PATRON_PALABRA_FECHA =
  /(?<!\p{L})(?:el\s+)?(hoy|anteayer|antier|ayer|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)(?!\p{L})/iu;
const SIGLO_ACTUAL = 2000;

// Sin fecha en el texto, el movimiento es de hoy (hora de Lima).
export function extraerFecha(texto: string, hoy: string): FechaExtraida {
  const numerica = texto.match(PATRON_FECHA_NUMERICA);
  const fechaNumerica = numerica ? fechaDesdeNumeros(numerica, hoy) : null;
  if (numerica && fechaNumerica) {
    return { fecha: fechaNumerica, textoRestante: quitarCoincidencia(texto, numerica) };
  }

  const palabra = texto.match(PATRON_PALABRA_FECHA);
  if (palabra) {
    return { fecha: fechaDesdePalabra(palabra[1], hoy), textoRestante: quitarCoincidencia(texto, palabra) };
  }

  return { fecha: hoy, textoRestante: texto };
}

// "10/11" sin año se asume del año actual, salvo que caiga en el futuro:
// en enero, "28/12" se refiere al diciembre pasado.
function fechaDesdeNumeros(coincidencia: RegExpMatchArray, hoy: string): string | null {
  const [, dia, mes, anioTexto] = coincidencia;
  const anioHoy = Number(hoy.slice(0, 4));

  if (anioTexto) {
    const anio = anioTexto.length === 2 ? SIGLO_ACTUAL + Number(anioTexto) : Number(anioTexto);
    return construirFechaIso(anio, Number(mes), Number(dia));
  }

  const fecha = construirFechaIso(anioHoy, Number(mes), Number(dia));
  if (fecha && fecha > hoy) return construirFechaIso(anioHoy - 1, Number(mes), Number(dia));
  return fecha;
}

// Un día de la semana es su ocurrencia más reciente: "el lunes" dicho un
// miércoles es hace 2 días; dicho el mismo lunes, es hoy.
function fechaDesdePalabra(palabra: string, hoy: string): string {
  const clave = normalizarParaComparar(palabra);
  const diasAtras = DIAS_ATRAS_POR_PALABRA[clave];
  if (diasAtras !== undefined) return restarDias(hoy, diasAtras);

  const diasDesdeEseDia = (diaDeSemana(hoy) - NUMERO_DIA_SEMANA[clave] + 7) % 7;
  return restarDias(hoy, diasDesdeEseDia);
}

function quitarCoincidencia(texto: string, coincidencia: RegExpMatchArray): string {
  const inicio = coincidencia.index ?? 0;
  return `${texto.slice(0, inicio)} ${texto.slice(inicio + coincidencia[0].length)}`;
}
