import { extraerMonto } from "../ingreso/extraer-monto.ts";
import type { Moneda } from "../movimientos/tipos.ts";
import { leerCampos, type CamposCorreo } from "./leer-campos.ts";
import { leerMomento } from "./leer-momento.ts";

export type ClaseOperacion = "consumo" | "transferencia";

export type OperacionBancaria = {
  clase: ClaseOperacion;
  montoCentimos: number;
  moneda: Moneda;
  fecha: string;
  ocurridoEn: string | null;
  descripcion: string;
  codigoOperacion: string | null;
};

export type Interpretacion =
  | { resultado: "operacion"; operacion: OperacionBancaria }
  | { resultado: "ignorado"; motivo: string }
  | { resultado: "error"; error: string };

// Incluye etiquetas que no se usan (Cuenta cargo, Medio de pago, Tarjeta) para
// que sus valores, con números de cuenta, no se mezclen con el campo anterior.
const ETIQUETAS = [
  "codigo de operacion",
  "fecha y hora",
  "fecha",
  "hora",
  "cuenta cargo",
  "cuenta destino",
  "medio de pago",
  "tarjeta",
  "comercio",
  "destinatario",
  "destino",
  "banco destino",
  "monto y moneda",
  "moneda y monto",
  "monto",
];

const LARGO_MAXIMO_DESCRIPCION = 120;
const MARCAS_DE_OCULTAMIENTO = /\*+/g;

// Tres plantillas vistas: constancia de transferencia (Plin/Yape), consumo con
// tarjeta nuevo (con código de operación) y consumo antiguo ("Comercio: ...").
// Lo que no tiene comercio ni destinatario (publicidad, estados de cuenta) se
// ignora; lo que sí lo tiene pero no se entiende es un error, para no perderlo.
export function interpretarCorreoInterbank(texto: string, fechaDeRespaldo: string): Interpretacion {
  const campos = leerCampos(texto, ETIQUETAS);
  const comercio = primeraLinea(campos, "comercio");
  const destinatario = primeraLinea(campos, "destinatario");
  if (!comercio && !destinatario) return { resultado: "ignorado", motivo: "no es un consumo ni una transferencia" };

  const textoMonto =
    primeraLinea(campos, "moneda y monto") ?? primeraLinea(campos, "monto y moneda") ?? primeraLinea(campos, "monto");
  const monto = textoMonto ? extraerMonto(textoMonto) : null;
  if (!monto) return { resultado: "error", error: "no se encontró el monto" };

  const momento = leerMomento(textoDeFecha(campos)) ?? { fecha: fechaDeRespaldo, ocurridoEn: null };

  return {
    resultado: "operacion",
    operacion: {
      clase: comercio ? "consumo" : "transferencia",
      montoCentimos: monto.montoCentimos,
      moneda: monto.moneda,
      fecha: momento.fecha,
      ocurridoEn: momento.ocurridoEn,
      descripcion: recortar(comercio ?? describirTransferencia(destinatario!, primeraLinea(campos, "destino"))),
      codigoOperacion: primeraLinea(campos, "codigo de operacion")?.match(/\d+/)?.[0] ?? null,
    },
  };
}

function primeraLinea(campos: CamposCorreo, etiqueta: string): string | null {
  return campos.get(etiqueta)?.[0] ?? null;
}

// "Fecha y hora" puede venir en una o dos líneas; la plantilla antigua separa
// "Fecha" y "Hora".
function textoDeFecha(campos: CamposCorreo): string {
  const fechaYHora = campos.get("fecha y hora");
  if (fechaYHora) return fechaYHora.join(" ");
  return [primeraLinea(campos, "fecha"), primeraLinea(campos, "hora")].filter(Boolean).join(" ");
}

// Solo la primera línea del destinatario: la segunda es su número de cuenta o
// celular, que no hace falta guardar. El banco oculta parte del apellido con *.
function describirTransferencia(destinatario: string, destino: string | null): string {
  const nombre = destinatario.replace(MARCAS_DE_OCULTAMIENTO, "").replace(/\s+/g, " ").trim();
  return `${destino ?? "Transferencia"} a ${nombre}`;
}

function recortar(texto: string): string {
  return texto.slice(0, LARGO_MAXIMO_DESCRIPCION);
}
