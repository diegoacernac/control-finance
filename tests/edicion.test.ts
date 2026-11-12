import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esFechaIsoValida } from "../lib/fechas/lima.ts";
import { leerMontoExacto } from "../lib/ingreso/leer-monto-exacto.ts";
import { parsearDestino } from "../lib/panel/destino.ts";

describe("leerMontoExacto", () => {
  const validos: [string, number][] = [
    ["3", 300],
    ["12.50", 1250],
    ["12,50", 1250],
    ["S/ 26.90", 2690],
    ["1,250.00", 125000],
    ["  tres  ", 300],
    ["doce con cincuenta", 1250],
  ];
  for (const [texto, centimos] of validos) {
    it(`acepta "${texto}"`, () => assert.equal(leerMontoExacto(texto), centimos));
  }

  for (const texto of ["", "taxi 12", "0", "abc", "12 13"]) {
    it(`rechaza "${texto}"`, () => assert.equal(leerMontoExacto(texto), null));
  }
});

describe("parsearDestino", () => {
  it("previsto y categoría", () => {
    assert.deepEqual(parsearDestino("previsto:12"), { categoriaId: null, previstoId: 12 });
    assert.deepEqual(parsearDestino("categoria:7"), { categoriaId: 7, previstoId: null });
  });

  it("rechaza lo que no tiene la forma esperada", () => {
    for (const valor of ["", "previsto:", "previsto:-1", "fijo:3", "categoria:7; drop", "previsto:1.5"]) {
      assert.equal(parsearDestino(valor), null, valor);
    }
  });
});

describe("esFechaIsoValida", () => {
  it("valida formato y día real", () => {
    assert.equal(esFechaIsoValida("2026-11-11"), true);
    assert.equal(esFechaIsoValida("2026-02-30"), false);
    assert.equal(esFechaIsoValida("11/11/2026"), false);
    assert.equal(esFechaIsoValida(""), false);
  });
});
