import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agruparPrevistos } from "../lib/panel/agrupar-previstos.ts";
import { construirCalendario } from "../lib/panel/calendario.ts";
import { calcularGastoDelMes } from "../lib/panel/gasto-por-categoria.ts";
import { calcularProyeccion } from "../lib/panel/proyeccion.ts";
import type { MovimientoPanel, PrevistoPanel } from "../lib/panel/tipos.ts";

// Miércoles 11 de noviembre de 2026; el 1 de noviembre es domingo.
const HOY = "2026-11-11";
const FIN_DE_MES = "2026-11-30";

let siguienteId = 1;

function previsto(campos: Partial<PrevistoPanel> & Pick<PrevistoPanel, "nombre">): PrevistoPanel {
  return {
    id: siguienteId++,
    tipo: "egreso",
    categoriaNombre: "Plataformas",
    persona: null,
    fechaEsperada: "2026-11-17",
    numeroCuota: null,
    cuotasTotal: null,
    estado: "pendiente",
    montoEsperadoCentimos: 1000,
    pagadoCentimos: 0,
    ...campos,
  };
}

function movimiento(campos: Partial<MovimientoPanel>): MovimientoPanel {
  return {
    id: siguienteId++,
    tipo: "egreso",
    montoCentimos: 1000,
    moneda: "PEN",
    fecha: HOY,
    descripcion: "algo",
    categoriaNombre: "Comida",
    categoriaRaiz: "Comida",
    previstoNombre: null,
    ...campos,
  };
}

const SUELDO = previsto({ nombre: "Sueldo", tipo: "ingreso", fechaEsperada: "2026-11-05", estado: "parcial", montoEsperadoCentimos: 280000, pagadoCentimos: 100000 });
const POZO = previsto({ nombre: "Pozo junta", tipo: "ingreso", fechaEsperada: "2026-11-15", montoEsperadoCentimos: 105000 });
const MADRE = previsto({ nombre: "Madre", tipo: "ingreso", fechaEsperada: null, estado: "parcial", montoEsperadoCentimos: 7500, pagadoCentimos: 1500 });
const BONO = previsto({ nombre: "Bono", tipo: "ingreso", fechaEsperada: "2027-01-15", montoEsperadoCentimos: 70000 });
const HBO = previsto({ nombre: "HBO", fechaEsperada: "2026-11-17", montoEsperadoCentimos: 2690 });
const ALQUILER = previsto({ nombre: "Alquiler", fechaEsperada: "2026-11-01", montoEsperadoCentimos: 40000 });
const DEUDA_OCTUBRE = previsto({ nombre: "Internet", fechaEsperada: "2026-10-10", montoEsperadoCentimos: 3500 });
const RIPLEY = previsto({ nombre: "Ripley", fechaEsperada: "2026-11-03", estado: "confirmado", montoEsperadoCentimos: 10035, pagadoCentimos: 10035 });
const JUNTA_OMITIDA = previsto({ nombre: "Junta", fechaEsperada: "2026-11-15", estado: "omitido", montoEsperadoCentimos: 5000 });
const PRIME_PAGADO = previsto({ nombre: "Prime", fechaEsperada: "2026-11-14", estado: "confirmado", montoEsperadoCentimos: 2590, pagadoCentimos: 2590 });
const UBER = previsto({ nombre: "Uber Plus", fechaEsperada: "2026-11-14", montoEsperadoCentimos: 1990 });

const TODOS = [SUELDO, POZO, MADRE, BONO, HBO, ALQUILER, DEUDA_OCTUBRE, RIPLEY, JUNTA_OMITIDA, PRIME_PAGADO, UBER];

describe("calcularProyeccion", () => {
  const proyeccion = calcularProyeccion(36047, TODOS, FIN_DE_MES);

  it("por cobrar: restante del sueldo parcial más el pozo; sin fecha y enero no cuentan", () => {
    assert.equal(proyeccion.porCobrarCentimos, 180000 + 105000);
  });

  it("por pagar: pendientes del mes y lo atrasado de meses anteriores; omitidos y confirmados no", () => {
    assert.equal(proyeccion.porPagarCentimos, 2690 + 40000 + 3500 + 1990);
  });

  it("cierre = saldo + por cobrar − por pagar", () => {
    assert.equal(proyeccion.cierreCentimos, 36047 + 285000 - 48180);
  });

  it("un pago mayor al esperado no resta de más", () => {
    const pagadoDeMas = previsto({ nombre: "Disney", estado: "parcial", montoEsperadoCentimos: 1000, pagadoCentimos: 1200 });
    assert.equal(calcularProyeccion(0, [pagadoDeMas], FIN_DE_MES).porPagarCentimos, 0);
  });
});

describe("agruparPrevistos", () => {
  const grupos = agruparPrevistos(TODOS, HOY, FIN_DE_MES);
  const nombres = (lista: PrevistoPanel[]) => lista.map((p) => p.nombre);

  it("atrasados, del más antiguo al más reciente", () => {
    assert.deepEqual(nombres(grupos.atrasados), ["Internet", "Alquiler", "Sueldo"]);
  });

  it("próximos del mes, por fecha", () => {
    assert.deepEqual(nombres(grupos.proximos), ["Uber Plus", "Pozo junta", "HBO"]);
  });

  it("sin fecha y más adelante van aparte", () => {
    assert.deepEqual(nombres(grupos.sinFecha), ["Madre"]);
    assert.deepEqual(nombres(grupos.masAdelante), ["Bono"]);
  });

  it("resueltos del mes incluyen confirmados y omitidos", () => {
    assert.deepEqual(nombres(grupos.resueltos), ["Ripley", "Prime", "Junta"]);
  });
});

describe("construirCalendario", () => {
  const calendario = construirCalendario(TODOS, HOY);
  const estado = (dia: number) => calendario.dias[dia - 1].estado;

  it("noviembre 2026: 30 días y empieza en domingo (6 espacios con lunes primero)", () => {
    assert.equal(calendario.dias.length, 30);
    assert.equal(calendario.espaciosIniciales, 6);
  });

  it("marca hoy", () => {
    assert.deepEqual(calendario.dias.filter((d) => d.esHoy).map((d) => d.dia), [11]);
  });

  it("estados por día", () => {
    assert.equal(estado(1), "atrasado");
    assert.equal(estado(3), "resuelto");
    assert.equal(estado(5), "atrasado");
    assert.equal(estado(17), "pendiente");
    assert.equal(estado(20), "sin-pagos");
  });

  it("un día con algo pagado y algo pendiente sigue pendiente", () => {
    assert.equal(estado(14), "pendiente");
  });

  it("el omitido no cuenta: el 15 solo muestra el pozo", () => {
    assert.equal(estado(15), "pendiente");
    assert.deepEqual(calendario.dias[14].nombres, ["Pozo junta"]);
  });

  it("un parcial de hoy en adelante se marca parcial", () => {
    const parcialFuturo = previsto({ nombre: "Padre", tipo: "ingreso", fechaEsperada: "2026-11-30", estado: "parcial" });
    assert.equal(construirCalendario([parcialFuturo], HOY).dias[29].estado, "parcial");
  });
});

describe("calcularGastoDelMes", () => {
  it("agrupa por categoría padre, ordena y calcula porcentajes", () => {
    const gasto = calcularGastoDelMes([
      movimiento({ montoCentimos: 6000, categoriaNombre: "Mascota › Arena", categoriaRaiz: "Mascota" }),
      movimiento({ montoCentimos: 10000, categoriaNombre: "Mascota › Comida", categoriaRaiz: "Mascota" }),
      movimiento({ montoCentimos: 4000 }),
      movimiento({ montoCentimos: 20000, categoriaNombre: null, categoriaRaiz: null }),
    ]);
    assert.equal(gasto.totalCentimos, 40000);
    assert.deepEqual(gasto.categorias, [
      { nombre: "Sin categoría", centimos: 20000, porcentaje: 50 },
      { nombre: "Mascota", centimos: 16000, porcentaje: 40 },
      { nombre: "Comida", centimos: 4000, porcentaje: 10 },
    ]);
  });

  it("ignora ingresos y dólares", () => {
    const gasto = calcularGastoDelMes([
      movimiento({ tipo: "ingreso", montoCentimos: 100000 }),
      movimiento({ moneda: "USD", montoCentimos: 2000 }),
    ]);
    assert.deepEqual(gasto, { totalCentimos: 0, categorias: [] });
  });
});
