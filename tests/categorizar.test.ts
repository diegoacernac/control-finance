import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorizar, type ReglaCategoria } from "../lib/categorias/categorizar.ts";

const REGLAS: ReglaCategoria[] = [
  { patron: "sueldo", categoriaId: 1, categoriaTipo: "ingreso", categoriaNombre: "Sueldo" },
  { patron: "netflix", categoriaId: 3, categoriaTipo: "ingreso", categoriaNombre: "Cuotas de plataformas" },
  { patron: "prestamo", categoriaId: 2, categoriaTipo: "ingreso", categoriaNombre: "Préstamos" },
  { patron: "prestamo", categoriaId: 4, categoriaTipo: "egreso", categoriaNombre: "Préstamos" },
  { patron: "netflix", categoriaId: 9, categoriaTipo: "egreso", categoriaNombre: "Plataformas" },
  { patron: "comida", categoriaId: 7, categoriaTipo: "egreso", categoriaNombre: "Comida" },
  { patron: "comida gato", categoriaId: 12, categoriaTipo: "egreso", categoriaNombre: "Mascota › Comida" },
  { patron: "gas", categoriaId: 8, categoriaTipo: "egreso", categoriaNombre: "Servicios" },
  { patron: "pedidosya", categoriaId: 7, categoriaTipo: "egreso", categoriaNombre: "Comida" },
  { patron: "pedidos ya", categoriaId: 7, categoriaTipo: "egreso", categoriaNombre: "Comida" },
];

describe("categorizar", () => {
  it("la regla define el tipo cuando no hay señal", () => {
    const resultado = categorizar("sueldo noviembre", null, REGLAS);
    assert.equal(resultado.tipo, "ingreso");
    assert.equal(resultado.categoria?.nombre, "Sueldo");
  });

  it("sin señal, una palabra de ambos tipos se toma como egreso", () => {
    const resultado = categorizar("netflix", null, REGLAS);
    assert.equal(resultado.tipo, "egreso");
    assert.equal(resultado.categoria?.id, 9);
  });

  it("con señal de ingreso usa la categoría de ingreso", () => {
    const resultado = categorizar("juan me pagó netflix", "ingreso", REGLAS);
    assert.equal(resultado.tipo, "ingreso");
    assert.equal(resultado.categoria?.id, 3);
  });

  it("ignora tildes y mayúsculas", () => {
    assert.equal(categorizar("Pago PRÉSTAMO banco", null, REGLAS).categoria?.id, 4);
  });

  it("el patrón más largo gana", () => {
    assert.equal(categorizar("comida gato 3kg", null, REGLAS).categoria?.id, 12);
  });

  it("solo palabras completas", () => {
    assert.equal(categorizar("gaseosa", null, REGLAS).categoria, null);
  });

  it("patrones de varias palabras y nombres de comercio con símbolos", () => {
    assert.equal(categorizar("PedidosYa*Codigo Gourme", null, REGLAS).categoria?.id, 7);
    assert.equal(categorizar("pedidos ya almuerzo", null, REGLAS).categoria?.id, 7);
  });

  it("sin coincidencia queda sin categoría y como egreso", () => {
    const resultado = categorizar("regalo cumpleaños", null, REGLAS);
    assert.deepEqual(resultado, { tipo: "egreso", categoria: null });
  });

  it("sin coincidencia respeta la señal de ingreso", () => {
    assert.equal(categorizar("bono", "ingreso", REGLAS).tipo, "ingreso");
  });
});
