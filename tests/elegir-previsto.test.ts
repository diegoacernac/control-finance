import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elegirPrevisto, type PrevistoAbierto } from "../lib/previstos/elegir-previsto.ts";

let siguienteId = 1;

function previsto(campos: Partial<PrevistoAbierto> & Pick<PrevistoAbierto, "nombre" | "patrones">): PrevistoAbierto {
  return {
    id: siguienteId++,
    fijoId: null,
    tipo: "egreso",
    categoriaId: 1,
    categoriaNombre: "Plataformas",
    persona: null,
    fechaEsperada: "2026-11-17",
    ...campos,
  };
}

const HBO = previsto({ fijoId: 1, nombre: "HBO", patrones: ["hbo"] });
const SUELDO_NOV = previsto({ fijoId: 2, nombre: "Sueldo", tipo: "ingreso", patrones: ["sueldo"], fechaEsperada: "2026-11-05" });
const SUELDO_DIC = previsto({ fijoId: 2, nombre: "Sueldo", tipo: "ingreso", patrones: ["sueldo"], fechaEsperada: "2026-12-05" });
const DISNEY_FABRICIO = previsto({ fijoId: 3, nombre: "Disney", tipo: "ingreso", persona: "Fabricio", patrones: ["disney"], fechaEsperada: "2026-11-20" });
const DISNEY_GABY = previsto({ fijoId: 4, nombre: "Disney", tipo: "ingreso", persona: "Gaby", patrones: ["disney"], fechaEsperada: "2026-11-20" });
const DISNEY_PROPIO = previsto({ fijoId: 5, nombre: "Disney", patrones: ["disney"], fechaEsperada: "2026-11-24" });
const PADRE = previsto({ nombre: "Padre", tipo: "ingreso", patrones: ["padre", "papa"], fechaEsperada: null });
const UBER_PLUS = previsto({ fijoId: 6, nombre: "Uber Plus", patrones: ["uber plus", "uber one"], fechaEsperada: "2026-11-14" });

const TODOS = [HBO, SUELDO_NOV, SUELDO_DIC, DISNEY_FABRICIO, DISNEY_GABY, DISNEY_PROPIO, PADRE, UBER_PLUS];

function elegido(descripcion: string, tipo: "ingreso" | "egreso", fecha = "2026-11-11"): PrevistoAbierto | null {
  const eleccion = elegirPrevisto(descripcion, tipo, fecha, TODOS);
  return eleccion.resultado === "elegido" ? eleccion.previsto : null;
}

describe("elegirPrevisto", () => {
  it("asocia por palabra y tipo", () => {
    assert.equal(elegido("hbo", "egreso")?.id, HBO.id);
  });

  it("acepta pagos hasta 10 días antes de la fecha", () => {
    assert.equal(elegido("hbo", "egreso", "2026-11-07")?.id, HBO.id);
    assert.equal(elegido("hbo", "egreso", "2026-11-06"), null);
  });

  it("un pago atrasado se asocia igual", () => {
    assert.equal(elegido("hbo", "egreso", "2026-12-03")?.id, HBO.id);
  });

  it("del mismo fijo salda el previsto más antiguo", () => {
    assert.equal(elegido("sueldo", "ingreso", "2026-12-02")?.id, SUELDO_NOV.id);
  });

  it("el tipo separa lo que pagas de lo que te pagan", () => {
    assert.equal(elegido("disney", "egreso", "2026-11-20")?.id, DISNEY_PROPIO.id);
  });

  it("si la única persona posible no se menciona, igual pregunta", () => {
    const soloFabricio = [DISNEY_FABRICIO];
    const eleccion = elegirPrevisto("gaby me pagó disney", "ingreso", "2026-11-11", soloFabricio);
    assert.deepEqual(eleccion, { resultado: "ambiguo", nombres: ["Disney (Fabricio)"] });
  });

  it("la persona elige entre fijos con la misma palabra", () => {
    assert.equal(elegido("fabricio me pagó disney", "ingreso")?.id, DISNEY_FABRICIO.id);
  });

  it("sin persona, varios fijos posibles es ambiguo", () => {
    const eleccion = elegirPrevisto("disney", "ingreso", "2026-11-11", TODOS);
    assert.deepEqual(eleccion, { resultado: "ambiguo", nombres: ["Disney (Fabricio)", "Disney (Gaby)"] });
  });

  it("un previsto sin fecha siempre está en ventana", () => {
    assert.equal(elegido("papá me yapeó", "ingreso")?.id, PADRE.id);
  });

  it("patrones de varias palabras no capturan la palabra suelta", () => {
    assert.equal(elegido("uber a la oficina", "egreso"), null);
    assert.equal(elegido("uber one", "egreso")?.id, UBER_PLUS.id);
  });

  it("sin coincidencia no elige nada", () => {
    assert.deepEqual(elegirPrevisto("almuerzo", "egreso", "2026-11-11", TODOS), { resultado: "ninguno" });
  });
});
