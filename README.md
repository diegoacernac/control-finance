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

1. Ejecuta las migraciones `20261112000004_vistas_y_acciones_web.sql` y `20261112000005_editar_movimiento.sql`.
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

`POST /api/movimientos`, con la cabecera `Authorization: Bearer <INGRESO_API_TOKEN>` y el cuerpo `{"texto": "taxi oficina 12.50"}`.

| Código | Cuándo |
|---|---|
| 201 | Registrado. `mensaje` trae el texto corto para mostrar; `movimiento`, el detalle. |
| 400 | El cuerpo no es `{"texto": "..."}` o pasa de 200 caracteres. |
| 401 | Falta el token o es incorrecto. |
| 422 | No se encontró el monto o la descripción. |

## Qué entiende el texto

- **Monto:** `12.50`, `12,50`, `1,250.00`, `S/ 19.30`, `S/.19.30`, `18 soles`. En dólares: `$20`, `US$ 20`, `2.99 usd`, `15 dólares`. Si hay varios números, gana el que tiene moneda y, si ninguno la tiene, el último.
- **Números en letras** (como los transcribe Siri): `quince soles`, `doce con cincuenta` (12.50), `treinta y cinco`, `mil doscientos`. "un"/"una" solo cuentan como número antes de "mil" o de una moneda ("un sol"), para no confundirlos con artículos ("un taxi").
- **Fecha:** `hoy`, `ayer`, `anteayer`, `el lunes` (el último lunes), `05/11`, `28/12/2025`. Sin fecha, es hoy en hora de Lima.
- **Ingreso:** `+` al inicio, `X me pagó / yapeó / plineó / transfirió` (guarda a X como persona), `cobré`, `recibí`. Si no hay ninguna de estas señales, decide la regla que coincida (`sueldo` es ingreso) y, si no hay regla, es egreso.

## Atajo de iOS

En la app Atajos, crea un atajo nuevo con estas acciones:

1. **Pedir entrada.** Tipo texto, con la pregunta "¿Qué gastaste?". Si lo lanzas con Siri, puedes dictar la respuesta.
2. **Obtener contenido de URL.**
   - URL: `https://<tu-app>.vercel.app/api/movimientos`
   - Método: `POST`
   - Encabezados: `Authorization` = `Bearer <tu token>`
   - Cuerpo: JSON, con la clave `texto` = *Entrada proporcionada*
3. **Obtener valor del diccionario.** Clave `mensaje`. Si viene vacío, usa la clave `error`.
4. **Mostrar notificación** con ese valor.

Luego asígnalo al botón de Acción, al toque posterior (Ajustes → Accesibilidad → Tocar → Toque posterior) o a un widget.

El token queda guardado dentro del atajo. No compartas el atajo sin quitarlo antes.

## Pruebas

```bash
npm test
```
