import type { TipoMovimiento } from "../movimientos/tipos.ts";
import { contieneFrase } from "../texto/normalizar.ts";

export type ReglaCategoria = {
  patron: string;
  categoriaId: number;
  categoriaTipo: TipoMovimiento;
  categoriaNombre: string;
};

export type Categorizacion = {
  tipo: TipoMovimiento;
  categoria: { id: number; nombre: string } | null;
};

export function categorizar(
  descripcion: string,
  tipoExplicito: TipoMovimiento | null,
  reglas: ReglaCategoria[],
): Categorizacion {
  const coincidencias = reglas.filter((r) => contieneFrase(descripcion, r.patron));

  const elegida = elegirMasEspecifica(filtrarPorTipo(coincidencias, tipoExplicito));
  if (!elegida) return { tipo: tipoExplicito ?? "egreso", categoria: null };

  return {
    tipo: elegida.categoriaTipo,
    categoria: { id: elegida.categoriaId, nombre: elegida.categoriaNombre },
  };
}

function filtrarPorTipo(reglas: ReglaCategoria[], tipoExplicito: TipoMovimiento | null): ReglaCategoria[] {
  if (tipoExplicito) return reglas.filter((r) => r.categoriaTipo === tipoExplicito);

  // Sin señal de ingreso, "netflix 44.90" es lo que pagas tú, no lo que te pagan.
  const egresos = reglas.filter((r) => r.categoriaTipo === "egreso");
  return egresos.length > 0 ? egresos : reglas;
}

// El patrón más largo es el más específico: "comida gato" gana a "comida".
function elegirMasEspecifica(reglas: ReglaCategoria[]): ReglaCategoria | undefined {
  return reglas.reduce<ReglaCategoria | undefined>(
    (mejor, regla) => (!mejor || regla.patron.length > mejor.patron.length ? regla : mejor),
    undefined,
  );
}
