import estilos from "./loading.module.css";

// Se muestra al instante al pasar del panel a Planificar (y al volver) mientras
// el servidor trae los datos.
export default function Cargando() {
  return (
    <div className={estilos.contenedor} role="status" aria-live="polite">
      <div className={estilos.barra} aria-hidden="true" />
      <p className={estilos.texto}>Cargando…</p>
    </div>
  );
}
