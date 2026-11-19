import { fechaEnLima } from "../fechas/lima.ts";
import type { CuerpoJson } from "../http/cuerpo-json.ts";
import { htmlATexto } from "./html-a-texto.ts";

export type CorreoRecibido = {
  referencia: string;
  remitente: string;
  fechaRecibido: string;
  texto: string;
  prueba: boolean;
};

const LARGO_MAXIMO_REFERENCIA = 200;
const LARGO_MAXIMO_REMITENTE = 300;
// Un correo de Interbank pesa ~60 KB de HTML; el límite corta abusos sin
// rechazar plantillas más cargadas.
const LARGO_MAXIMO_CUERPO = 500_000;
// interbank.pe, netinterbank.com.pe y otros subdominios peruanos del banco.
const DOMINIO_INTERBANK = /@[\w.-]*interbank[\w.-]*\.pe>?\s*$/i;

// Cuerpo que envía el script de Gmail: {referencia, remitente, recibidoEn,
// html?, texto?, prueba?}. Se prefiere el HTML: su tabla conserva las
// etiquetas en líneas separadas; el texto plano es el respaldo.
export function leerCorreoRecibido(cuerpo: CuerpoJson): CorreoRecibido | null {
  const referencia = textoAcotado(cuerpo.referencia, LARGO_MAXIMO_REFERENCIA);
  const remitente = textoAcotado(cuerpo.remitente, LARGO_MAXIMO_REMITENTE);
  const recibidoEn = typeof cuerpo.recibidoEn === "string" ? Date.parse(cuerpo.recibidoEn) : Number.NaN;
  const html = textoAcotado(cuerpo.html, LARGO_MAXIMO_CUERPO);
  const textoPlano = textoAcotado(cuerpo.texto, LARGO_MAXIMO_CUERPO);
  const prueba = cuerpo.prueba === undefined ? false : cuerpo.prueba;

  if (!referencia || !remitente || Number.isNaN(recibidoEn) || typeof prueba !== "boolean") return null;
  if (!html && !textoPlano) return null;

  return {
    referencia,
    remitente,
    fechaRecibido: fechaEnLima(new Date(recibidoEn)),
    texto: html ? htmlATexto(html) : textoPlano!,
    prueba,
  };
}

// Defensa adicional al filtro de Gmail: solo se procesan correos de un dominio
// de Interbank. No reemplaza la autenticación del correo, que ya hace Gmail.
export function esRemitenteInterbank(remitente: string): boolean {
  return DOMINIO_INTERBANK.test(remitente.trim());
}

function textoAcotado(valor: unknown, largoMaximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto && texto.length <= largoMaximo ? texto : null;
}
