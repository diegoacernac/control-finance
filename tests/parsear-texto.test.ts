import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsearTexto, type MovimientoParseado } from "../lib/ingreso/parsear-texto.ts";

// Miércoles 11 de noviembre de 2026.
const HOY = "2026-11-11";

function parsearOk(texto: string): MovimientoParseado {
  const resultado = parsearTexto(texto, HOY);
  assert.ok(resultado.ok, `debió parsear: ${texto}`);
  return resultado.movimiento;
}

describe("monto", () => {
  const casos: [string, number, "PEN" | "USD"][] = [
    ["uber oficina 12.50", 1250, "PEN"],
    ["uber oficina 12,50", 1250, "PEN"],
    ["taxi 12,5", 1250, "PEN"],
    ["alquiler 1,250.00", 125000, "PEN"],
    ["alquiler 1.250,50", 125050, "PEN"],
    ["alquiler 1,250", 125000, "PEN"],
    ["sueldo 4500", 450000, "PEN"],
    ["farmacia S/ 19.30", 1930, "PEN"],
    ["farmacia s/.19.30", 1930, "PEN"],
    ["almuerzo 18 soles", 1800, "PEN"],
    ["steam $20", 2000, "USD"],
    ["chatgpt us$ 20", 2000, "USD"],
    ["icloud 2.99 usd", 299, "USD"],
    ["dominio 15 dólares", 1500, "USD"],
  ];

  for (const [texto, centimos, moneda] of casos) {
    it(texto, () => {
      const movimiento = parsearOk(texto);
      assert.equal(movimiento.montoCentimos, centimos);
      assert.equal(movimiento.moneda, moneda);
    });
  }

  it("con varios números elige el último", () => {
    const movimiento = parsearOk("menú 2 personas 36");
    assert.equal(movimiento.montoCentimos, 3600);
    assert.equal(movimiento.descripcion, "menú 2 personas");
  });

  it("con varios números prefiere el que tiene moneda", () => {
    assert.equal(parsearOk("S/ 36 menú 2 personas").montoCentimos, 3600);
  });

  it("no toma números pegados a letras", () => {
    assert.equal(parsearOk("mp3 player 40").montoCentimos, 4000);
  });

  it("falla sin monto", () => {
    assert.deepEqual(parsearTexto("almuerzo", HOY).ok, false);
  });

  it("falla con monto cero", () => {
    assert.deepEqual(parsearTexto("almuerzo 0", HOY).ok, false);
  });

  it("falla sin descripción", () => {
    assert.deepEqual(parsearTexto("12.50", HOY).ok, false);
  });
});

describe("fecha", () => {
  const casos: [string, string][] = [
    ["almuerzo 18", "2026-11-11"],
    ["almuerzo 18 hoy", "2026-11-11"],
    ["almuerzo ayer 18", "2026-11-10"],
    ["almuerzo anteayer 18", "2026-11-09"],
    ["almuerzo el lunes 18", "2026-11-09"],
    ["almuerzo miércoles 18", "2026-11-11"],
    ["almuerzo el jueves 18", "2026-11-05"],
    ["almuerzo 05/11 18", "2026-11-05"],
    ["almuerzo 28/12 18", "2025-12-28"],
    ["almuerzo 28/12/2025 18", "2025-12-28"],
    ["almuerzo 3/1/26 18", "2026-01-03"],
  ];

  for (const [texto, fecha] of casos) {
    it(texto, () => {
      const movimiento = parsearOk(texto);
      assert.equal(movimiento.fecha, fecha);
      assert.equal(movimiento.montoCentimos, 1800);
      assert.equal(movimiento.descripcion, "almuerzo");
    });
  }

  it("una fecha imposible no se toma como fecha", () => {
    const movimiento = parsearOk("almuerzo 31/02 18");
    assert.equal(movimiento.fecha, HOY);
  });
});

describe("tipo y persona", () => {
  it("sin señal no fuerza tipo", () => {
    assert.equal(parsearOk("netflix 44.90").tipoExplicito, null);
  });

  it("+ al inicio es ingreso", () => {
    const movimiento = parsearOk("+4500 sueldo");
    assert.equal(movimiento.tipoExplicito, "ingreso");
    assert.equal(movimiento.montoCentimos, 450000);
    assert.equal(movimiento.descripcion, "sueldo");
  });

  it("'X me pagó' es ingreso con persona", () => {
    const movimiento = parsearOk("juan carlos me pagó netflix 10");
    assert.equal(movimiento.tipoExplicito, "ingreso");
    assert.equal(movimiento.persona, "Juan Carlos");
  });

  it("'me yapeó' con fecha antes del nombre", () => {
    const movimiento = parsearOk("ayer maria me yapeo hbo 6");
    assert.equal(movimiento.tipoExplicito, "ingreso");
    assert.equal(movimiento.persona, "Maria");
    assert.equal(movimiento.fecha, "2026-11-10");
  });

  it("'cobré' es ingreso sin persona", () => {
    const movimiento = parsearOk("cobré préstamo 200");
    assert.equal(movimiento.tipoExplicito, "ingreso");
    assert.equal(movimiento.persona, null);
  });

  it("dictado de Siri con número en letras y posesivo", () => {
    const movimiento = parsearOk("Mi madre me pagó quince soles");
    assert.equal(movimiento.tipoExplicito, "ingreso");
    assert.equal(movimiento.montoCentimos, 1500);
    assert.equal(movimiento.persona, "Madre");
  });

  it("'me' dentro de otra palabra no cuenta", () => {
    assert.equal(parsearOk("jaime pagó taxi 10").tipoExplicito, null);
  });
});
