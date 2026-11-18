# finance-control

Registro de finanzas personales con una frase: `taxi oficina 12.50`, `ayer juan me pagó netflix 10`, `+4500 sueldo`. Diseño y fases en [docs/diseno.md](docs/diseno.md).

## Puesta en marcha

1. **Base de datos.** En un proyecto de Supabase, ejecuta en orden los archivos de `supabase/migrations/`. Puedes pegarlos en el SQL Editor o usar `npx supabase db push` con el proyecto enlazado.
2. **Variables.** Copia `.env.example` a `.env.local` y completa los valores. El token se genera con:
   ```bash
   openssl rand -hex 32
   ```
3. **Local.**
   ```bash
   npm run dev
   ```
4. **Vercel.** Carga las mismas tres variables en Project Settings → Environment Variables.

## Web

Arriba hay un campo para anotar un movimiento con el mismo texto que el atajo. En "Últimos registros", cada movimiento se puede editar (monto, fecha, descripción y a qué corresponde) o eliminar.

La página principal muestra con cuánto cierras el mes, el calendario de pagos y cobros, lo que viene, lo que quedó por revisar, el gasto por categoría y los últimos registros. Solo entra el correo de `CORREO_PROPIETARIO`, con un enlace que llega por correo.

Para activarla:

1. Ejecuta las migraciones `20261112000004_vistas_y_acciones_web.sql`, `20261112000005_editar_movimiento.sql` y `20261118000006_prestamos_y_confirmar.sql`.
2. Agrega `SUPABASE_PUBLISHABLE_KEY` y `CORREO_PROPIETARIO` en `.env.local` y en Vercel.
3. En Supabase → Authentication → URL Configuration, pon tu URL de Vercel como **Site URL** y agrega en **Redirect URLs** `https://<tu-app>.vercel.app/auth/confirmar` y `http://localhost:3000/auth/confirmar`.
4. Después de entrar por primera vez, desactiva "Allow new users to sign up" en Supabase → Authentication → Sign In / Providers. Así nadie más puede crear una cuenta en tu proyecto.

El enlace del correo debe abrirse en el mismo navegador donde lo pediste.

### Entrar con Google

1. En Google Cloud Console → APIs y servicios → Pantalla de consentimiento de OAuth: tipo **Externo**, y agrega tu correo como usuario de prueba.
2. En Credenciales → Crear credenciales → **ID de cliente de OAuth**, tipo Aplicación web. En "URI de redireccionamiento autorizados" pega la Callback URL que muestra Supabase en Authentication → Sign In / Providers → Google (`https://<proyecto>.supabase.co/auth/v1/callback`).
3. En ese mismo panel de Supabase, activa Google y pega el Client ID y el Client Secret.

Solo entra la cuenta de Google cuyo correo sea `CORREO_PROPIETARIO`.

## API

Todas con la cabecera `Authorization: Bearer <INGRESO_API_TOKEN>`.

**`POST /api/movimientos`**: `{"texto": "taxi oficina 12.50", "tipo": "pago"}`. `tipo` es opcional: `"pago"` o `"cobro"`. Sin tipo, se deduce del texto.

**`POST /api/prestamos`**: `{"quien": "Gaby 120", "devolucion": "130", "cuando": "2 de diciembre"}`, las tres respuestas tal cual se dictan.

| Código | Cuándo |
|---|---|
| 201 | Registrado. `mensaje` trae el texto corto para mostrar. |
| 400 | Faltan campos o el JSON no tiene la forma esperada. |
| 401 | Falta el token o es incorrecto. |
| 422 | No se entendió algún dato; el error dice cuál y qué se recibió. |

## Qué entiende el texto

- **Monto:** `12.50`, `12,50`, `1,250.00`, `S/ 19.30`, `S/.19.30`, `18 soles`. En dólares: `$20`, `US$ 20`, `2.99 usd`, `15 dólares`. Si hay varios números, gana el que tiene moneda y, si ninguno la tiene, el último.
- **Números en letras** (como los transcribe Siri): `quince soles`, `doce con cincuenta` (12.50), `treinta y cinco`, `mil doscientos`. "un"/"una" solo cuentan como número antes de "mil" o de una moneda ("un sol"), para no confundirlos con artículos ("un taxi").
- **Fecha:** `hoy`, `ayer`, `anteayer`, `el lunes` (el último lunes), `05/11`, `28/12/2025`. Sin fecha, es hoy en hora de Lima.
- **Cobro** (si no se eligió el tipo): `+` al inicio; `X me pagó / pagaron / yapeó / plineó / transfirió / depositó / devolvió / envió / abonó` (guarda a X como persona); `cobré`; `recibí`. Si no hay ninguna de estas señales, decide la regla que coincida (`sueldo` es cobro) y, si no hay regla, es pago.
- **Préstamo, "¿a quién y cuánto?":** `Gaby 120`, `a Corina ciento cincuenta`, `le presté a Juan 50`.
- **Préstamo, "¿cuándo?":** `el 25`, `25`, `2 de diciembre`, `02/12`, `mañana`, `fin de mes`. Un día que ya pasó este mes se entiende del mes siguiente.

## Atajo de iOS

En la app Atajos, crea un atajo nuevo:

1. **Elegir del menú**, con la pregunta "¿Qué tipo?" y tres opciones: **Pago**, **Cobro**, **Préstamo**.
2. En **Pago**:
   - **Pedir entrada**, tipo texto: "¿Qué pagaste?".
   - **Obtener contenido de URL**: `https://<tu-app>.vercel.app/api/movimientos`, método `POST`, encabezado `Authorization` = `Bearer <tu token>`, cuerpo JSON con `texto` = *Entrada proporcionada* y `tipo` = `pago`.
3. En **Cobro**: lo mismo, con la pregunta "¿Qué cobraste?" y `tipo` = `cobro`.
4. En **Préstamo**:
   - **Pedir entrada** "¿A quién y cuánto?". Luego **Establecer variable** `quien`.
   - **Pedir entrada** "¿Cuánto te devuelve?". Luego **Establecer variable** `devolucion`.
   - **Pedir entrada** "¿Cuándo te devuelve?". Luego **Establecer variable** `cuando`.
   - **Obtener contenido de URL**: `https://<tu-app>.vercel.app/api/prestamos`, método `POST`, el mismo encabezado, cuerpo JSON con `quien`, `devolucion` y `cuando` = las variables.
5. Después del menú (**Fin del menú**):
   - **Obtener valor del diccionario**, clave `mensaje`, en *Contenido de URL*.
   - **Si** tiene algún valor, **Mostrar resultado** con él; **de lo contrario**, obtén la clave `error` y muéstrala.

Luego asígnalo al botón de Acción, al toque posterior (Ajustes → Accesibilidad → Tocar → Toque posterior) o a un widget. Con Siri, di el nombre del atajo y elige la opción con la voz.

El token queda guardado dentro del atajo. No compartas el atajo sin quitarlo antes.

## Pruebas

```bash
npm test
```
