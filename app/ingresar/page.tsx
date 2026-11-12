import { ingresarConGoogle } from "./acciones.ts";
import { FormularioIngreso } from "./FormularioIngreso.tsx";
import estilos from "./ingresar.module.css";

// Lee ?error= de la URL; el permiso del layout no cubre los datos de la URL.
export const instant = false;

const MENSAJES_DE_ERROR: Record<string, string> = {
  ingreso: "No se pudo completar el ingreso. Si usaste el enlace, ábrelo en el mismo navegador donde lo pediste.",
  cuenta: "Esa cuenta no tiene acceso. Entra con tu correo.",
  google: "No se pudo conectar con Google. Intenta de nuevo.",
};

export default async function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  const { error } = await searchParams;
  const mensajeError = typeof error === "string" ? MENSAJES_DE_ERROR[error] : undefined;

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.marca}>Finanzas</h1>

      {mensajeError && (
        <p role="alert" className={estilos.mensajeError}>
          {mensajeError}
        </p>
      )}

      <form action={ingresarConGoogle} className={estilos.google}>
        <button type="submit" className={estilos.boton}>
          Entrar con Google
        </button>
      </form>

      <details className={estilos.alternativa}>
        <summary>O recibe un enlace en tu correo</summary>
        <FormularioIngreso />
      </details>
    </main>
  );
}
