"use client";

import estilos from "./ingresar/ingresar.module.css";

export default function ErrorDePagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.marca}>Finanzas</h1>
      <p className={estilos.bajada}>No se pudieron cargar tus datos. Suele ser algo pasajero de conexión.</p>
      <button type="button" onClick={reset} className={estilos.boton}>
        Reintentar
      </button>
    </main>
  );
}
