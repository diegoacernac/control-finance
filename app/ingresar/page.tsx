import { FormularioIngreso } from "./FormularioIngreso.tsx";
import estilos from "./ingresar.module.css";

// Lee ?error= de la URL; el permiso del layout no cubre los datos de la URL.
export const instant = false;

export default async function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  const { error } = await searchParams;

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.marca}>Finanzas</h1>
      <p className={estilos.bajada}>Te envío un enlace a tu correo para entrar, sin contraseña.</p>

      {error === "enlace" && (
        <p role="alert" className={estilos.mensajeError}>
          El enlace venció o se abrió en otro navegador. Pide uno nuevo.
        </p>
      )}

      <FormularioIngreso />
    </main>
  );
}
