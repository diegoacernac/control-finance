import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esRemitenteInterbank, leerCorreoRecibido } from "../lib/correos/correo-recibido.ts";
import { htmlATexto } from "../lib/correos/html-a-texto.ts";
import { interpretarCorreoInterbank, type Interpretacion } from "../lib/correos/interpretar-correo-interbank.ts";
import { leerMomento } from "../lib/correos/leer-momento.ts";

const RESPALDO = "2026-11-19";

// Reproducciones de las plantillas vistas, con datos inventados.
const TRANSFERENCIA_HTML = `
<html><head><style>td { color: gray }</style></head><body>
<p>Hola DIEGO, te enviamos tu</p><h1>Constancia de transferencia</h1>
<table>
<tr><td>Código de operación</td><td>01235107</td></tr>
<tr><td>Fecha y hora</td><td>02 Oct 2026<br>9:35 PM</td></tr>
<tr><td>Cuenta cargo</td><td>Ahorro Sueldo<br>Soles<br>612 3456789012</td></tr>
<tr><td>Destinatario</td><td>Rosa Mar**<br>600 1234 5678</td></tr>
<tr><td>Destino</td><td>Plin</td></tr>
<tr><td>Moneda y monto</td><td>S/&nbsp;300.35</td></tr>
</table><p>¿Tienes dudas? Llámanos</p></body></html>`;

const CONSUMO_NUEVO_TEXTO = `Diego, realizaste un consumo
Código de operación
9107630557
Fecha y hora
04 Ago 2026
09:52 PM
Medio de pago
Débito Clásica
4213 55** **** 1234
Comercio
METRO PIZARRO
Moneda y monto
S/ 41.50`;

const CONSUMO_ANTIGUO_HTML = `
<div>Diego Alexander, realizaste un consumo con tu Tarjeta Interbank Visa Débito Cl&aacute;sica</div>
<div>Conoce el detalle:</div>
<div>Tarjeta: <b>***0884</b></div>
<div>Comercio: <b>PedidosYa*Codigo Gourme</b></div>
<div>Monto: <b>S/. 19.30</b></div>
<div>Fecha: <b>25/10/2026</b></div>
<div>Hora: <b>01:02 PM</b></div>
<div>¿Vas a comprar por internet? Realiza tu pago consultando el número, fecha de vencimiento y CVV</div>`;

function operacion(interpretacion: Interpretacion) {
  assert.equal(interpretacion.resultado, "operacion");
  return (interpretacion as Extract<Interpretacion, { resultado: "operacion" }>).operacion;
}

describe("interpretarCorreoInterbank", () => {
  it("constancia de transferencia por Plin", () => {
    const resultado = operacion(interpretarCorreoInterbank(htmlATexto(TRANSFERENCIA_HTML), RESPALDO));
    assert.deepEqual(resultado, {
      clase: "transferencia",
      montoCentimos: 30035,
      moneda: "PEN",
      fecha: "2026-10-02",
      ocurridoEn: "2026-10-02T21:35:00-05:00",
      descripcion: "Plin a Rosa Mar",
      codigoOperacion: "01235107",
    });
  });

  it("consumo con tarjeta, plantilla nueva en texto plano", () => {
    const resultado = operacion(interpretarCorreoInterbank(CONSUMO_NUEVO_TEXTO, RESPALDO));
    assert.equal(resultado.clase, "consumo");
    assert.equal(resultado.descripcion, "METRO PIZARRO");
    assert.equal(resultado.montoCentimos, 4150);
    assert.equal(resultado.ocurridoEn, "2026-08-04T21:52:00-05:00");
    assert.equal(resultado.codigoOperacion, "9107630557");
  });

  it("consumo con tarjeta, plantilla antigua", () => {
    const resultado = operacion(interpretarCorreoInterbank(htmlATexto(CONSUMO_ANTIGUO_HTML), RESPALDO));
    assert.equal(resultado.descripcion, "PedidosYa*Codigo Gourme");
    assert.equal(resultado.montoCentimos, 1930);
    assert.equal(resultado.fecha, "2026-10-25");
    assert.equal(resultado.ocurridoEn, "2026-10-25T13:02:00-05:00");
    assert.equal(resultado.codigoOperacion, null);
  });

  it("etiqueta y valor en la misma línea separados por espacios", () => {
    const texto = "Comercio   NETFLIX.COM\nMoneda y monto   US$ 9.99\nFecha y hora 11 Nov 2026 08:00 AM";
    const resultado = operacion(interpretarCorreoInterbank(texto, RESPALDO));
    assert.equal(resultado.descripcion, "NETFLIX.COM");
    assert.equal(resultado.moneda, "USD");
    assert.equal(resultado.ocurridoEn, "2026-11-11T08:00:00-05:00");
  });

  it("sin fecha legible usa la del correo", () => {
    const resultado = operacion(interpretarCorreoInterbank("Comercio: TAMBO\nMonto: S/ 5.50", RESPALDO));
    assert.equal(resultado.fecha, RESPALDO);
    assert.equal(resultado.ocurridoEn, null);
  });

  it("publicidad: se ignora", () => {
    const resultado = interpretarCorreoInterbank("Aprovecha 0% de interés en tus compras. Fecha límite 30/11/2026", RESPALDO);
    assert.equal(resultado.resultado, "ignorado");
  });

  it("parece operación pero sin monto: error, para no perderla", () => {
    const resultado = interpretarCorreoInterbank("Comercio: TAMBO\nMonto: --", RESPALDO);
    assert.equal(resultado.resultado, "error");
  });
});

describe("leerMomento", () => {
  const casos: [string, string | null][] = [
    ["20 Oct 2026 11:05 PM", "2026-10-20T23:05:00-05:00"],
    ["01 Dic 2026 12:10 AM", "2026-12-01T00:10:00-05:00"],
    ["15 Set 2026 12:30 p. m.", "2026-09-15T12:30:00-05:00"],
  ];
  for (const [texto, esperado] of casos) {
    it(texto, () => assert.equal(leerMomento(texto)?.ocurridoEn, esperado));
  }

  it("fecha inválida", () => assert.equal(leerMomento("31 Feb 2026"), null));
});

describe("correo recibido", () => {
  it("prefiere el HTML y exige referencia y fecha", () => {
    const correo = leerCorreoRecibido({
      referencia: "gmail:abc",
      remitente: "Interbank <servicioalcliente@netinterbank.com.pe>",
      recibidoEn: "2026-11-19T03:00:00.000Z",
      html: "<td>Comercio</td><td>TAMBO</td>",
      texto: "otro",
    });
    assert.ok(correo);
    assert.equal(correo.fechaRecibido, "2026-11-18");
    assert.match(correo.texto, /TAMBO/);
    assert.equal(correo.prueba, false);

    assert.equal(leerCorreoRecibido({ referencia: "x", remitente: "a@b.pe", recibidoEn: "ayer", texto: "t" }), null);
    assert.equal(leerCorreoRecibido({ referencia: "x", remitente: "a@b.pe", recibidoEn: "2026-11-19T00:00:00Z" }), null);
  });

  it("solo dominios de Interbank", () => {
    assert.equal(esRemitenteInterbank("Interbank <servicioalcliente@netinterbank.com.pe>"), true);
    assert.equal(esRemitenteInterbank("notificaciones@interbank.pe"), true);
    assert.equal(esRemitenteInterbank("Interbank <soporte@interbank-seguro.com>"), false);
    assert.equal(esRemitenteInterbank("x@gmail.com"), false);
  });
});
