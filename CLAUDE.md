@AGENTS.md

# finance-control

Control de finanzas personales: registro por texto libre ("taxi oficina 12.50") desde un atajo de iOS o desde el chat; la web es solo para revisar. Diseño y fases en [docs/diseno.md](docs/diseno.md).

## Explicación del código
- El código que escribe Claude debo poder leerlo y entenderlo: al terminar, lista los archivos creados o cambiados (con enlace) y explica el flujo de punta a punta (qué entra, qué pasa en cada paso, qué sale) y qué hace cada pieza.
- Señala decisiones no obvias, casos borde cubiertos y lo que quedó fuera.

## Convenciones
- Nombres de dominio en español (`movimientos`, `fuentes`, `reglas`), igual en SQL y TypeScript.
- Montos siempre en céntimos (`integer`), nunca decimales.
- Fechas de negocio en hora de Lima (`lib/fechas/lima.ts`); el servidor corre en UTC.
- Lógica pura (parser, categorizador) sin dependencias de Supabase, para probarla con `npm test` (runner nativo de Node).
- Imports relativos con extensión `.ts` dentro de `lib/`, para que Node pueda correr las pruebas sin compilar.
- Cambios de base de datos: nueva migración en `supabase/migrations/`, nunca editar una ya aplicada.
- La clave secreta de Supabase solo se usa en el servidor (`lib/supabase/cliente-servidor.ts`).
