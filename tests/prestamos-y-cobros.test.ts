import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsearTexto } from "../lib/ingreso/parsear-texto.ts";
import { leerTipoElegido } from "../lib/movimientos/tipo-elegido.ts";
import { calcularGastoDelMes } from "../lib/panel/gasto-por-categoria.ts";
import type { MovimientoPanel } from "../lib/panel/tipos.ts";
import { elegirPrevisto, type PrevistoAbierto } from "../lib/previstos/elegir-previsto.ts";
import { leerFechaFutura } from "../lib/prestamos/leer-fecha-futura.ts";
import { leerPersonaYMonto, patronesDeDevolucion, validarPrestamo } from "../lib/prestamos/prestamo.ts";

// Miércoles 18 de noviembre de 2026.
const HOY = "2026-11-18";

describe("frases de cobro", () => {
  const casos: [string, string | null][] = [
    ["juan me pagó 10", "Juan"],
    ["me pagaron 50 del trabajo", null],
    ["mis tíos me yapearon 100", "Tíos"],
    ["gaby me depositó 130", "Gaby"],
    ["corina me transfirió 180", "Corina"],
    ["me devolvieron 20", null],
    ["recibí 15 de mi madre", null],
    ["cobré 200", null],
  ];

  for (const [texto, persona] of casos) {
    it(texto, () => {
      const resultado = parsearTexto(texto, HOY);
      assert.ok(resultado.ok);
      assert.equal(resultado.movimiento.tipoExplicito, "ingreso");
      assert.equal(resultado.movimiento.persona, persona);
    });
  }

  it("el tipo elegido en el menú manda sobre el texto", () => {
    const comoCobro = parsearTexto("gaby 130", HOY, "ingreso");
    const comoPago = parsearTexto("juan me pagó 10", HOY, "egreso");
    assert.ok(comoCobro.ok && comoPago.ok);
    assert.equal(comoCobro.movimiento.tipoExplicito, "ingreso");
    assert.equal(comoPago.movimiento.tipoExplicito, "egreso");
  });
});

describe("leerTipoElegido", () => {
  it("pago, cobro o nada", () => {
    assert.deepEqual(leerTipoElegido("pago"), { valido: true, tipo: "egreso" });
    assert.deepEqual(leerTipoElegido(" Cobro "), { valido: true, tipo: "ingreso" });
    assert.deepEqual(leerTipoElegido(undefined), { valido: true, tipo: null });
    assert.deepEqual(leerTipoElegido(""), { valido: true, tipo: null });
  });

  it("rechaza lo demás", () => {
    assert.deepEqual(leerTipoElegido("prestamo"), { valido: false });
    assert.deepEqual(leerTipoElegido(3), { valido: false });
  });
});

describe("leerFechaFutura", () => {
  const casos: [string, string | null][] = [
    ["25", "2026-11-25"],
    ["el 25", "2026-11-25"],
    ["veinticinco", "2026-11-25"],
    ["el 18", "2026-11-18"],
    ["el 10", "2026-12-10"],
    ["2 de diciembre", "2026-12-02"],
    ["el 2 de Diciembre.", "2026-12-02"],
    ["5 de enero", "2027-01-05"],
    ["10 de noviembre", "2027-11-10"],
    ["02/12", "2026-12-02"],
    ["02/12/2026", "2026-12-02"],
    ["2026-12-02", "2026-12-02"],
    ["mañana", "2026-11-19"],
    ["pasado mañana", "2026-11-20"],
    ["fin de mes", "2026-11-30"],
    ["31", "2026-12-31"],
    ["31 de febrero", null],
    ["cuando pueda", null],
  ];

  for (const [texto, esperado] of casos) {
    it(texto, () => assert.equal(leerFechaFutura(texto, HOY), esperado));
  }

  it("en diciembre, un día ya pasado cae en enero del año siguiente", () => {
    assert.equal(leerFechaFutura("el 5", "2026-12-20"), "2027-01-05");
  });
});

describe("leerPersonaYMonto", () => {
  const casos: [string, { persona: string; montoCentimos: number } | null][] = [
    ["Gaby 120", { persona: "Gaby", montoCentimos: 12000 }],
    ["a Corina ciento cincuenta", { persona: "Corina", montoCentimos: 15000 }],
    ["le presté a juan carlos 50.50", { persona: "juan carlos", montoCentimos: 5050 }],
    ["para Ana 20 soles", { persona: "Ana", montoCentimos: 2000 }],
    ["Gaby", null],
    ["120", null],
    ["Gaby $20", null],
  ];

  for (const [texto, esperado] of casos) {
    it(texto, () => assert.deepEqual(leerPersonaYMonto(texto), esperado));
  }
});

describe("validarPrestamo", () => {
  const base = { persona: "gaby", montoCentimos: 12000, devolucionCentimos: 13000, fecha: HOY, fechaDevolucion: "2026-12-02" };

  it("acepta y formatea el nombre", () => {
    const resultado = validarPrestamo(base, HOY);
    assert.ok(resultado.ok);
    assert.equal(resultado.prestamo.persona, "Gaby");
  });

  it("rechaza fecha pasada, montos en cero y nombres raros", () => {
    assert.equal(validarPrestamo({ ...base, fechaDevolucion: "2026-11-17" }, HOY).ok, false);
    assert.equal(validarPrestamo({ ...base, devolucionCentimos: 0 }, HOY).ok, false);
    assert.equal(validarPrestamo({ ...base, persona: "<script>" }, HOY).ok, false);
    assert.equal(validarPrestamo({ ...base, persona: " " }, HOY).ok, false);
  });

  it("patrones de la devolución: nombre y la palabra préstamo", () => {
    assert.deepEqual(patronesDeDevolucion("Gaby"), ["gaby", "prestamo"]);
  });
});

describe("devolución de préstamo frente a otros cobros de la misma persona", () => {
  const previsto = (campos: Partial<PrevistoAbierto> & Pick<PrevistoAbierto, "id" | "nombre" | "patrones">): PrevistoAbierto => ({
    fijoId: null,
    tipo: "ingreso",
    categoriaId: 1,
    categoriaNombre: "Préstamos",
    persona: "Gaby",
    fechaEsperada: "2026-12-02",
    ...campos,
  });
  const DISNEY_GABY = previsto({ id: 1, fijoId: 9, nombre: "Disney", patrones: ["disney"], categoriaNombre: "Cuotas de plataformas", fechaEsperada: "2026-11-20" });
  const PRESTAMO_GABY = previsto({ id: 2, nombre: "Préstamo", patrones: patronesDeDevolucion("Gaby") });
  const PRESTAMO_CORINA = previsto({ id: 3, nombre: "Préstamo", persona: "Corina", patrones: patronesDeDevolucion("Corina"), fechaEsperada: "2026-11-25" });
  const TODOS = [DISNEY_GABY, PRESTAMO_GABY, PRESTAMO_CORINA];

  const elegido = (descripcion: string) => {
    const eleccion = elegirPrevisto(descripcion, "ingreso", HOY, TODOS);
    return eleccion.resultado === "elegido" ? eleccion.previsto.id : eleccion.resultado;
  };

  it("'gaby me pagó disney' va a Disney, no al préstamo", () => {
    assert.equal(elegido("gaby me pagó disney"), DISNEY_GABY.id);
  });

  it("'gaby me pagó' va al préstamo", () => {
    assert.equal(elegido("gaby me pagó"), PRESTAMO_GABY.id);
  });

  it("'corina me devolvió el préstamo' va al préstamo de Corina", () => {
    assert.equal(elegido("corina me devolvió el préstamo"), PRESTAMO_CORINA.id);
  });

  it("'me devolvieron el préstamo' sin nombre pregunta", () => {
    assert.equal(elegido("me devolvieron el préstamo"), "ambiguo");
  });
});

describe("gasto del mes sin préstamos otorgados", () => {
  it("el préstamo no cuenta como gasto", () => {
    const movimiento = (campos: Partial<MovimientoPanel>): MovimientoPanel => ({
      id: 1, tipo: "egreso", montoCentimos: 1000, moneda: "PEN", fecha: HOY, descripcion: "x",
      categoriaNombre: "Comida", categoriaRaiz: "Comida", previstoNombre: null, cuentaComoGasto: true, ...campos,
    });
    const gasto = calcularGastoDelMes([
      movimiento({ montoCentimos: 1800 }),
      movimiento({ montoCentimos: 12000, categoriaNombre: "Préstamo otorgado", categoriaRaiz: "Préstamo otorgado", cuentaComoGasto: false }),
    ]);
    assert.equal(gasto.totalCentimos, 1800);
    assert.deepEqual(gasto.categorias.map((c) => c.nombre), ["Comida"]);
  });
});
