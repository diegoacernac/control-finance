import { TEMAS, type Tema } from "@/lib/tema.ts";
import { cambiarTema } from "../acciones-tema.ts";
import estilos from "../panel.module.css";
import { BotonEnviar } from "./BotonEnviar.tsx";

const ETIQUETA: Record<Tema, string> = { auto: "Auto", claro: "Claro", oscuro: "Oscuro" };

export function SelectorTema({ actual }: { actual: Tema }) {
  return (
    <form className={estilos.selectorTema} aria-label="Tema">
      {TEMAS.map((tema) => (
        <BotonEnviar
          key={tema}
          formAction={cambiarTema.bind(null, tema)}
          aria-pressed={tema === actual}
          className={estilos.opcionTema}
        >
          {ETIQUETA[tema]}
        </BotonEnviar>
      ))}
    </form>
  );
}
