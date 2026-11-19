import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mesDespues } from "../lib/fechas/lima.ts";
import { cuotasQueTerminan, previstosDelRango, totalesPorCategoria } from "../lib/planificar/lista-del-rango.ts";
import { proyectarMeses } from "../lib/planificar/proyectar-meses.ts";
import { leerRango } from "../lib/planificar/rango.ts";
import { CATEGORIA_AHORRO, type PrevistoPlan } from "../lib/planificar/tipos.ts";
import { leerMontoOCero, validarPlaneado } from "../lib/planificar/validar-formularios.ts";

const HOY = "2026-11-18";
let siguienteId = 1;

function previsto(campos: Partial<PrevistoPlan>): PrevistoPlan {
  return {
    id: siguienteId++,
    fijoId: 1,
    nombre: "Algo",
    tipo: "egreso",
    categoriaNombre: "Servicios",
    persona: null,
    fechaEsperada: "2026-12-10",
    numeroCuota: null,
    cuotasTotal: null,
    estado: "pendiente",
    montoEsperadoCentimos: 10000,
    pagadoCentimos: 0,
    planeado: false,
    ...campos,
  };
}

describe("proyectarMeses", () => {
  const previstos = [
    // Noviembre: atrasado, del mes, parcial y omitido.
    previsto({ nombre: "Luz", fechaEsperada: "2026-11-05", montoEsperadoCentimos: 8000 }),
    previsto({ nombre: "Sueldo", tipo: "ingreso", fechaEsperada: "2026-11-30", montoEsperadoCentimos: 280000, pagadoCentimos: 100000, estado: "parcial" }),
    previsto({ nombre: "HBO", fechaEsperada: "2026-11-25", montoEsperadoCentimos: 2990, estado: "omitido" }),
    previsto({ nombre: "Pagado", fechaEsperada: "2026-11-20", estado: "confirmado" }),
    // Diciembre.
    previsto({ nombre: "Sueldo dic", tipo: "ingreso", fechaEsperada: "2026-12-30", montoEsperadoCentimos: 280000 }),
    previsto({ nombre: "Alquiler", fechaEsperada: "2026-12-01", montoEsperadoCentimos: 90000 }),
    previsto({ nombre: "Viaje", fijoId: null, planeado: true, fechaEsperada: "2026-12-20", montoEsperadoCentimos: 150000 }),
    previsto({ nombre: "Ahorro", categoriaNombre: CATEGORIA_AHORRO, fechaEsperada: "2026-12-05", montoEsperadoCentimos: 30000 }),
    // Sin fecha: no cuenta.
    previsto({ nombre: "Madre", tipo: "ingreso", fechaEsperada: null }),
  ];

  const meses = proyectarMeses({
    hoy: HOY,
    hasta: "2027-01-31",
    saldoCentimos: 50000,
    previstos,
    gastoVariableMensualCentimos: 45000,
    gastoVariableDelMesCentimos: 30000,
  });

  it("un mes por fila, del actual al del fin del rango", () => {
    assert.deepEqual(meses.map((m) => m.mes), ["2026-11-01", "2026-12-01", "2027-01-01"]);
  });

  it("noviembre: lo que falta, con lo atrasado y sin lo omitido; variable descontando lo ya gastado", () => {
    const [noviembre] = meses;
    assert.equal(noviembre.inicioCentimos, 50000);
    assert.equal(noviembre.entraCentimos, 180000);
    assert.equal(noviembre.fijosCentimos, 8000);
    assert.equal(noviembre.variableCentimos, 15000);
    assert.equal(noviembre.libreCentimos, 180000 - 8000 - 15000);
    assert.equal(noviembre.cierreCentimos, 50000 + 157000);
  });

  it("diciembre parte del cierre de noviembre y separa únicos y ahorro", () => {
    const [noviembre, diciembre] = meses;
    assert.equal(diciembre.inicioCentimos, noviembre.cierreCentimos);
    assert.equal(diciembre.fijosCentimos, 90000);
    assert.equal(diciembre.unicosCentimos, 150000);
    assert.equal(diciembre.ahorroCentimos, 30000);
    assert.equal(diciembre.variableCentimos, 45000);
    assert.equal(diciembre.libreCentimos, 280000 - 90000 - 150000 - 45000);
    assert.equal(diciembre.cierreCentimos, noviembre.cierreCentimos - 5000 - 30000);
  });

  it("un mes sin previstos solo resta el variable", () => {
    const [, diciembre, enero] = meses;
    assert.equal(enero.libreCentimos, -45000);
    assert.equal(enero.cierreCentimos, diciembre.cierreCentimos - 45000);
  });

  it("si ya gastaste más que el estimado, el variable del mes es cero", () => {
    const [noviembre] = proyectarMeses({
      hoy: HOY, hasta: "2026-11-30", saldoCentimos: 0, previstos: [],
      gastoVariableMensualCentimos: 45000, gastoVariableDelMesCentimos: 60000,
    });
    assert.equal(noviembre.variableCentimos, 0);
  });
});

describe("leerRango", () => {
  it("por defecto, de hoy al fin del tercer mes", () => {
    assert.deepEqual(leerRango({}, HOY), { vista: "3m", desde: HOY, hasta: "2027-01-31", tipo: "todo", aviso: null });
  });

  it("mes siguiente y 6 meses", () => {
    const siguiente = leerRango({ ver: "siguiente", tipo: "egreso" }, HOY);
    assert.equal(siguiente.desde, "2026-12-01");
    assert.equal(siguiente.hasta, "2026-12-31");
    assert.equal(siguiente.tipo, "egreso");
    assert.equal(leerRango({ ver: "6m" }, HOY).hasta, "2027-04-30");
  });

  it("fechas libres dentro del horizonte", () => {
    const rango = leerRango({ ver: "fechas", desde: "2026-12-01", hasta: "2027-01-15", tipo: "ingreso" }, HOY);
    assert.deepEqual(rango, { vista: "fechas", desde: "2026-12-01", hasta: "2027-01-15", tipo: "ingreso", aviso: null });
  });

  it("fechas inválidas caen en la vista por defecto con aviso", () => {
    for (const [desde, hasta] of [["2027-02-01", "2027-01-01"], ["2026-10-01", "2026-12-01"], ["2026-12-01", "2027-12-01"], ["x", "y"]]) {
      const rango = leerRango({ ver: "fechas", desde, hasta }, HOY);
      assert.equal(rango.vista, "3m");
      assert.ok(rango.aviso);
    }
  });

  it("valores desconocidos se ignoran", () => {
    const rango = leerRango({ ver: "99m", tipo: "otro" }, HOY);
    assert.equal(rango.vista, "3m");
    assert.equal(rango.tipo, "todo");
  });
});

describe("lista del rango", () => {
  const previstos = [
    previsto({ nombre: "Netflix", fechaEsperada: "2026-12-15", categoriaNombre: "Plataformas" }),
    previsto({ nombre: "Sueldo", tipo: "ingreso", fechaEsperada: "2026-12-30", categoriaNombre: "Sueldo" }),
    previsto({ nombre: "Arena", fechaEsperada: "2027-01-05", categoriaNombre: "Mascota › Arena" }),
    previsto({ nombre: "Chuches", fechaEsperada: "2027-01-06", categoriaNombre: "Mascota › Chuches", estado: "omitido" }),
    previsto({ nombre: "Fuera", fechaEsperada: "2027-03-01" }),
  ];
  const rango = leerRango({ ver: "3m", tipo: "egreso" }, HOY);

  it("filtra por tipo y rango, agrupa por mes e incluye lo omitido", () => {
    const grupos = previstosDelRango(previstos, rango);
    assert.deepEqual(grupos.map((g) => [g.mes, g.previstos.map((p) => p.nombre)]), [
      ["2026-12-01", ["Netflix"]],
      ["2027-01-01", ["Arena", "Chuches"]],
    ]);
  });

  it("totales por categoría raíz, sin lo omitido", () => {
    const totales = totalesPorCategoria(previstosDelRango(previstos, rango));
    assert.deepEqual(totales.map((t) => [t.nombre, t.totalCentimos]), [["Plataformas", 10000], ["Mascota", 10000]]);
  });

  it("cuotas que terminan en el rango", () => {
    const cuotas = cuotasQueTerminan(
      [
        previsto({ nombre: "Ripley", numeroCuota: 12, cuotasTotal: 12, fechaEsperada: "2027-01-15" }),
        previsto({ nombre: "Ripley", numeroCuota: 11, cuotasTotal: 12, fechaEsperada: "2026-12-15" }),
        previsto({ nombre: "Juan", numeroCuota: 6, cuotasTotal: 6, fechaEsperada: "2027-06-15" }),
      ],
      HOY,
      "2027-01-31",
    );
    assert.deepEqual(cuotas.map((c) => c.fechaEsperada), ["2027-01-15"]);
  });
});

describe("formularios de planificación", () => {
  const base = { nombre: "  Viaje   Cusco ", tipo: "egreso", categoriaId: "7", monto: "1,500", fecha: "2027-02-15" };

  it("planeado válido: nombre limpio y patrón normalizado", () => {
    const resultado = validarPlaneado(base, HOY);
    assert.ok(resultado.ok);
    assert.deepEqual(resultado.valor, {
      nombre: "Viaje Cusco", tipo: "egreso", categoriaId: 7, montoCentimos: 150000, fecha: "2027-02-15", patrones: ["viaje cusco"],
    });
  });

  it("rechaza fecha pasada o lejana, tipo, categoría y monto inválidos", () => {
    assert.equal(validarPlaneado({ ...base, fecha: "2026-11-17" }, HOY).ok, false);
    assert.equal(validarPlaneado({ ...base, fecha: "2027-11-01" }, HOY).ok, false);
    assert.equal(validarPlaneado({ ...base, tipo: "prestamo" }, HOY).ok, false);
    assert.equal(validarPlaneado({ ...base, categoriaId: "abc" }, HOY).ok, false);
    assert.equal(validarPlaneado({ ...base, monto: "mucho" }, HOY).ok, false);
    assert.equal(validarPlaneado({ ...base, nombre: "***" }, HOY).ok, false);
  });

  it("monto o cero", () => {
    assert.equal(leerMontoOCero("0"), 0);
    assert.equal(leerMontoOCero("0.00"), 0);
    assert.equal(leerMontoOCero("300"), 30000);
    assert.equal(leerMontoOCero("-5"), null);
  });

  it("mesDespues cruza el año", () => {
    assert.equal(mesDespues("2026-11-30", 2), "2027-01-01");
    assert.equal(mesDespues("2026-01-31", -1), "2025-12-01");
  });
});
