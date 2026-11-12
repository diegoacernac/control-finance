import { TEMAS, type Tema } from "@/lib/tema.ts";
import { cambiarTema } from "../acciones-tema.ts";
import estilos from "../panel.module.css";

const ETIQUETA: Record<Tema, string> = { auto: "Auto", claro: "Claro", oscuro: "Oscuro" };

export function SelectorTema({ actual }: { actual: Tema }) {
  return (
    <form className={estilos.selectorTema} aria-label="Tema">
      {TEMAS.map((tema) => (
        <button
          key={tema}
          type="submit"
          formAction={cambiarTema.bind(null, tema)}
          aria-pressed={tema === actual}
          className={estilos.opcionTema}
        >
          {ETIQUETA[tema]}
        </button>
      ))}
    </form>
  );
}
