// "A qué corresponde" un movimiento viaja en un solo campo del formulario:
// "previsto:12" o "categoria:7".
export type Destino = { categoriaId: number | null; previstoId: number | null };

const PATRON_DESTINO = /^(previsto|categoria):(\d{1,15})$/;

export function valorDestino(clase: "previsto" | "categoria", id: number): string {
  return `${clase}:${id}`;
}

export function parsearDestino(valor: string): Destino | null {
  const coincidencia = valor.match(PATRON_DESTINO);
  if (!coincidencia) return null;

  const id = Number(coincidencia[2]);
  return coincidencia[1] === "previsto" ? { categoriaId: null, previstoId: id } : { categoriaId: id, previstoId: null };
}
