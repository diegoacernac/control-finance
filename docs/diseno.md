# Diseño

## Idea
Registrar un movimiento debe costar una frase. El texto se convierte en monto, moneda, fecha, tipo y categoría; la web solo sirve para revisar y corregir.

## Modelo
- **movimientos**: la transacción real; lo único que suma en totales.
- **fuentes**: cada evidencia de un movimiento (`manual`, `correo_banco`, `correo_comercio`, `fijo`). Un mismo gasto puede tener hasta tres: lo que escribiste, el correo de Interbank y el recibo del comercio.
- **categorias** (con subcategorías vía `padre_id`) y **reglas** (palabra → categoría).

## Categorización
1. Señales del texto: `+` al inicio, "X me pagó/yapeó/plineó/transfirió", "cobré", "recibí" → ingreso.
2. Reglas por palabra completa, sin tildes. Si una palabra existe en ingreso y egreso (netflix), sin señal se toma egreso.
3. Gana el patrón más largo ("comida gato" sobre "comida").
4. Sin coincidencia: sin categoría y `por_revisar`.

## Fijos y previstos
- **fijos**: plantilla (monto de referencia, uno o más días de pago, patrones, persona opcional, cuotas opcionales, vigente desde).
- **previstos**: cada aparición esperada de un fijo en un mes, o un ingreso/egreso único (`fijo_id` null, fecha opcional). Se generan solos con `asegurar_previstos` en cada registro; no hay cron.
- Al registrar, un movimiento en soles se asocia a un previsto abierto del mismo tipo si el texto contiene uno de sus patrones y, si tiene persona, también la persona. Ventana: hasta 10 días antes de la fecha esperada, sin límite hacia atrás (pagos atrasados).
- Varios previstos del mismo fijo → se salda el más antiguo. Varios fijos, o persona no mencionada → ambiguo, queda por revisar.
- Estado: desde el 90% del esperado es `confirmado`; por debajo, `parcial` (sueldo en partes). Un solo cobro que confirma actualiza el monto de referencia del fijo (precios y tipo de cambio que varían).
- Cuotas: los omitidos no cuentan (el turno propio en la junta). Si se omite un previsto después de generar los siguientes, la numeración de esos queda corrida en uno.
- Los datos personales (fijos, saldos) se cargan con SQL en `supabase/datos-personales/`, ignorado por git.

## Cuentas y saldo
- Saldo base conocido (el del banco) en un momento; suman/restan los movimientos en soles de fechas posteriores, o del mismo día registrados después. Vista `saldos_cuentas`.
- Los registros manuales van a la cuenta predeterminada (Interbank). BBVA existe con saldo 0 hasta integrarla.

## Web
- Login por enlace al correo (Supabase Auth, PKCE). `proxy.ts` renueva la sesión; cada página y cada acción llama a `exigirPropietario`, que solo acepta el correo de `CORREO_PROPIETARIO`.
- La base sigue cerrada a `anon`/`authenticated`: la web lee y escribe desde el servidor con la clave secreta, después de verificar la sesión. No hay Supabase en el navegador.
- "Cierras el mes con" = saldo de las cuentas + restante de previstos abiertos de ingreso − restante de los de egreso, con fecha hasta fin de mes (incluye atrasados; excluye sin fecha y posteriores).
- Calendario: un día con algo abierto manda sobre lo resuelto; los omitidos no pintan.
- Estilo: papel y tinta, Fraunces para títulos y cifras grandes, IBM Plex Mono para datos, bordes rectos. Modo nocturno automático. Tokens en `app/globals.css`.
- Registro desde la web con el mismo parser que el atajo. Edición de monto, fecha, descripción y destino de los últimos 10 movimientos; la función `editar_movimiento` recalcula el previsto anterior y el nuevo. Tipo y moneda no se editan (se elimina y se vuelve a registrar).
- Pendiente: editar fijos y reglas, historial con filtros (y editar movimientos más antiguos), actualizar saldo base, crear regla al corregir.

## Fases
1. **Base** (hecha): esquema, parser, reglas, `POST /api/movimientos` con token, atajo de iOS.
2. **Fijos** (hecha): fijos, previstos (incluidos únicos), cuentas con saldo.
3. **Correos**: Gmail (filtro + etiqueta) → Apps Script cada 5 min → `POST /api/correos`. Parsing en TypeScript. Conciliación: misma moneda y monto en una ventana de tiempo → adjuntar fuente; ninguno → movimiento nuevo; varios → bandeja "por conciliar".
4. **Web** (primera versión hecha): login, dashboard, omitir/reabrir previstos, bandeja por revisar, eliminar registros.
5. **Extras**: categorización con IA para lo que no coincide, servidor MCP para registrar y consultar desde el chat.

## Notas para la fase 3 (correos vistos)
- **Interbank, constancia de transferencia (Yape/Plin)**: código de operación, "Fecha y hora" (`20 Oct 2026 11:05 PM`), destinatario, destino, monto. La etiqueta del monto varía: "Monto y moneda" / "Moneda y monto". Leer pares etiqueta → valor sin depender del orden.
- **Interbank, consumo con tarjeta, plantilla nueva**: código de operación, fecha `04 Ago 2026 09:52 PM` (meses en español), medio de pago, comercio, "Moneda y monto".
- **Interbank, consumo con tarjeta, plantilla antigua**: sin código de operación; "Comercio: PedidosYa*Codigo Gourme", "Monto: S/. 19.30", "Fecha: 25/10/2026", "Hora: 01:02 PM". Para idempotencia usar el id del mensaje de Gmail.
- **Uber**: el monto real es el de "Pagos"/"Total" (ya con créditos), no la tarifa.
- **Rappi**: "Total pagado S/.20.54"; el cargo a la tarjeta fue ~1 h después del pedido. La ventana de conciliación debe tolerar horas, no minutos.
- Formatos de monto: `S/ 11.00`, `S/. 19.30`, `S/.20.54`.
- **Anthropic (Claude Pro)**: el recibo llega a Outlook, no a Gmail, en US$ 20.00. El monto en soles que importa es el que debita Interbank; falta ver ese correo de consumo en dólares.
