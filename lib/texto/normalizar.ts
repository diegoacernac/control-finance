const MARCAS_DIACRITICAS = /\p{M}/gu;
const SEPARADORES = /[^\p{L}\p{N}]+/gu;

// "PedidosYa*Código" → "pedidosya codigo": así una regla escrita sin tildes
// coincide con lo que dictes o con el nombre de comercio que mande el banco.
export function normalizarParaComparar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .replace(SEPARADORES, " ")
    .trim();
}

// Los espacios en los bordes hacen que solo coincidan palabras completas:
// "gas" no debe coincidir dentro de "gaseosa".
export function contieneFrase(texto: string, frase: string): boolean {
  const fraseNormalizada = normalizarParaComparar(frase);
  if (!fraseNormalizada) return false;
  return ` ${normalizarParaComparar(texto)} `.includes(` ${fraseNormalizada} `);
}
