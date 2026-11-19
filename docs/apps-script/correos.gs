// Envía a la app los correos nuevos de Interbank. Se pega en script.google.com
// (pasos en el README, sección "Correos de Interbank"). Solo lee Gmail: no
// marca, mueve ni borra nada. La app ignora lo repetido, así que reenviar un
// correo no lo duplica.

const CONSULTA_POR_DEFECTO = "from:interbank";
const DIAS_HACIA_ATRAS_LA_PRIMERA_VEZ = 2;
const DIAS_HACIA_ATRAS_EN_PRUEBA = 7;
const MAXIMO_POR_EJECUCION = 30;
const CORREOS_EN_PRUEBA = 5;
const PAGINAS_MAXIMAS = 4;
const MINUTOS_ENTRE_EJECUCIONES = 5;
const CLAVE_ULTIMO_PROCESADO = "ULTIMO_PROCESADO_MS";
const MS_POR_DIA = 86400000;
// after: de Gmail va en segundos y redondea; el filtro exacto se hace después.
const MARGEN_SEGUNDOS = 60;

// Lo ejecuta el disparador cada 5 minutos.
function procesarCorreos() {
  const config = leerConfiguracion();
  const guardado = Number(config.propiedades.getProperty(CLAVE_ULTIMO_PROCESADO));
  const desde = guardado || Date.now() - DIAS_HACIA_ATRAS_LA_PRIMERA_VEZ * MS_POR_DIA;
  const noEntendidos = [];

  for (const resumen of buscarMensajes(config.consulta, desde).slice(0, MAXIMO_POR_EJECUCION)) {
    const mensaje = leerMensaje(resumen.id);
    const respuesta = enviar(config, mensaje, false);

    // Sin token válido o con la app caída no se avanza: se reintenta en la
    // próxima ejecución desde este mismo correo.
    if (respuesta.codigo === 401 || respuesta.codigo >= 500) {
      throw new Error("La app respondió " + respuesta.codigo + ". Se reintenta en la próxima ejecución.");
    }
    if (respuesta.codigo !== 200) {
      noEntendidos.push(mensaje.asunto + " (" + new Date(mensaje.fechaMs).toLocaleString() + "): " + respuesta.cuerpo.error);
    }
    config.propiedades.setProperty(CLAVE_ULTIMO_PROCESADO, String(mensaje.fechaMs));
  }

  // Fallar a propósito hace que Google te avise por correo; esos movimientos
  // hay que anotarlos a mano.
  if (noEntendidos.length > 0) {
    throw new Error("La app no entendió estos correos; anótalos a mano:\n" + noEntendidos.join("\n"));
  }
}

// Para revisar antes de activar: interpreta los últimos correos sin guardar
// nada y muestra el resultado en el registro de ejecución.
function probarCorreos() {
  const config = leerConfiguracion();
  const recientes = buscarMensajes(config.consulta, Date.now() - DIAS_HACIA_ATRAS_EN_PRUEBA * MS_POR_DIA);

  for (const resumen of recientes.slice(-CORREOS_EN_PRUEBA)) {
    const mensaje = leerMensaje(resumen.id);
    const respuesta = enviar(config, mensaje, true);
    Logger.log(mensaje.asunto + " → " + respuesta.codigo + " " + JSON.stringify(respuesta.cuerpo));
  }
}

function instalarDisparador() {
  ScriptApp.getProjectTriggers()
    .filter(function (disparador) { return disparador.getHandlerFunction() === "procesarCorreos"; })
    .forEach(function (disparador) { ScriptApp.deleteTrigger(disparador); });
  ScriptApp.newTrigger("procesarCorreos").timeBased().everyMinutes(MINUTOS_ENTRE_EJECUCIONES).create();
}

// El token vive en las propiedades del script, nunca en el código.
function leerConfiguracion() {
  const propiedades = PropertiesService.getScriptProperties();
  const url = propiedades.getProperty("URL_API_CORREOS");
  const token = propiedades.getProperty("CORREOS_API_TOKEN");
  if (!url || !token) {
    throw new Error("Faltan URL_API_CORREOS o CORREOS_API_TOKEN en Configuración del proyecto → Propiedades del script.");
  }
  return { propiedades: propiedades, url: url, token: token, consulta: propiedades.getProperty("CONSULTA_GMAIL") || CONSULTA_POR_DEFECTO };
}

// Devuelve {id, fechaMs} del más antiguo al más nuevo, solo posteriores a desdeMs.
function buscarMensajes(consulta, desdeMs) {
  const filtro = consulta + " after:" + (Math.floor(desdeMs / 1000) - MARGEN_SEGUNDOS);
  const ids = [];
  let pagina;
  for (let vuelta = 0; vuelta < PAGINAS_MAXIMAS; vuelta++) {
    const lista = Gmail.Users.Messages.list("me", { q: filtro, maxResults: 50, pageToken: pagina });
    (lista.messages || []).forEach(function (m) { ids.push(m.id); });
    pagina = lista.nextPageToken;
    if (!pagina) break;
  }

  return ids
    .map(function (id) {
      return { id: id, fechaMs: Number(Gmail.Users.Messages.get("me", id, { format: "minimal" }).internalDate) };
    })
    .filter(function (m) { return m.fechaMs > desdeMs; })
    .sort(function (a, b) { return a.fechaMs - b.fechaMs; });
}

function leerMensaje(id) {
  const mensaje = Gmail.Users.Messages.get("me", id, { format: "full" });
  return {
    id: id,
    fechaMs: Number(mensaje.internalDate),
    remitente: cabecera(mensaje.payload, "from"),
    asunto: cabecera(mensaje.payload, "subject"),
    html: buscarParte(mensaje.payload, "text/html"),
    texto: buscarParte(mensaje.payload, "text/plain"),
  };
}

function cabecera(parte, nombre) {
  const encontrada = (parte.headers || []).find(function (h) { return h.name.toLowerCase() === nombre; });
  return encontrada ? encontrada.value : "";
}

function buscarParte(parte, tipo) {
  if (parte.mimeType === tipo && parte.body && parte.body.data) return decodificar(parte);
  for (const hija of parte.parts || []) {
    const encontrada = buscarParte(hija, tipo);
    if (encontrada) return encontrada;
  }
  return null;
}

// El servicio avanzado de Gmail entrega el cuerpo en base64 web-safe (o ya
// como bytes, según la versión); el juego de caracteres viene en la cabecera.
function decodificar(parte) {
  const datos = parte.body.data;
  const bytes = Array.isArray(datos) ? datos : Utilities.base64DecodeWebSafe(datos);
  const juego = (cabecera(parte, "content-type").match(/charset="?([\w-]+)/i) || [])[1] || "UTF-8";
  return Utilities.newBlob(bytes).getDataAsString(juego);
}

function enviar(config, mensaje, prueba) {
  const respuesta = UrlFetchApp.fetch(config.url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + config.token },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      referencia: "gmail:" + mensaje.id,
      remitente: mensaje.remitente,
      recibidoEn: new Date(mensaje.fechaMs).toISOString(),
      html: mensaje.html,
      texto: mensaje.texto,
      prueba: prueba,
    }),
  });

  let cuerpo = {};
  try {
    cuerpo = JSON.parse(respuesta.getContentText());
  } catch (error) {
    cuerpo = { error: "respuesta no válida de la app" };
  }
  return { codigo: respuesta.getResponseCode(), cuerpo: cuerpo };
}
