import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertirNumerosEnPalabras } from "../lib/ingreso/convertir-numeros-en-palabras.ts";

describe("convertirNumerosEnPalabras", () => {
  const casos: [string, string][] = [
    ["mi madre me pagó quince soles", "mi madre me pagó 15 soles"],
    ["taxi doce con cincuenta", "taxi 12.50"],
    ["taxi doce con cinco", "taxi 12.05"],
    ["treinta y cinco internet", "35 internet"],
    ["treinta y un soles", "31 soles"],
    ["veintiún soles", "21 soles"],
    ["ciento veinte", "120"],
    ["ciento veintitrés con noventa", "123.90"],
    ["alquiler cuatrocientos", "alquiler 400"],
    ["mil doscientos cincuenta", "1250"],
    ["dos mil", "2000"],
    ["un mil quinientos", "1500"],
    ["un sol", "1 sol"],
    ["un taxi doce", "un taxi 12"],
    ["una cena treinta", "una cena 30"],
    ["dos tres", "2 3"],
    ["menú dos personas treinta y seis", "menú 2 personas 36"],
    ["hbo 26.90", "hbo 26.90"],
    ["sin números aquí", "sin números aquí"],
  ];

  for (const [entrada, esperado] of casos) {
    it(entrada, () => assert.equal(convertirNumerosEnPalabras(entrada), esperado));
  }
});
