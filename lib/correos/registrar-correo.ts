import { cargarReglas } from "../categorias/cargar-reglas.ts";
import { categorizar } from "../categorias/categorizar.ts";
import { formatearMonto } from "../movimientos/formato-monto.ts";
import { clasificar } from "../movimientos/registrar-movimiento-manual.ts";
import { crearClienteServidor } from "../supabase/cliente-servidor.ts";
import type { OperacionBancaria } from "./interpretar-correo-interbank.ts";

export type ResultadoConciliacion = "creado" | "unido" | "duplicado";

type FilaConciliacion = { resultado: ResultadoConciliacion; id_movimiento: number };

// Los consumos y las transferencias que avisa el banco son plata que sale.
const TIPO_DE_OPERACION = "egreso";

// referencia: id del mensaje de Gmail, único aunque la plantilla no traiga
// código de operación. Se categoriza con las mismas reglas y previstos que el
// texto dictado ("NETFLIX.COM" salda el previsto de Netflix).
export async function registrarCorreo(referencia: string, operacion: OperacionBancaria): Promise<ResultadoConciliacion> {
  const supabase = crearClienteServidor();
  const categorizacion = categorizar(operacion.descripcion, TIPO_DE_OPERACION, await cargarReglas(supabase));
  const clasificacion = await clasificar(supabase, operacion, categorizacion);
  const previsto = clasificacion.eleccion.resultado === "elegido" ? clasificacion.eleccion.previsto : null;

  const { data, error } = await supabase
    .rpc("registrar_correo_banco", {
      p_referencia: referencia,
      p_contenido: resumirOperacion(operacion),
      p_tipo: TIPO_DE_OPERACION,
      p_monto_centimos: operacion.montoCentimos,
      p_moneda: operacion.moneda,
      p_fecha: operacion.fecha,
      p_ocurrido_en: operacion.ocurridoEn,
      p_descripcion: operacion.descripcion,
      p_categoria_id: clasificacion.categoria?.id ?? null,
      p_origen_categoria: clasificacion.origen,
      p_por_revisar: clasificacion.categoria === null || clasificacion.eleccion.resultado === "ambiguo",
      p_previsto_id: previsto?.id ?? null,
    })
    .single<FilaConciliacion>();

  if (error) throw new Error(`No se pudo registrar el correo: ${error.message}`);
  return data.resultado;
}

// Se guarda un resumen, no el correo: el cuerpo trae números de cuenta y
// tarjeta que no hacen falta para conciliar.
function resumirOperacion(operacion: OperacionBancaria): string {
  const partes = [
    `Interbank · ${operacion.clase}`,
    operacion.descripcion,
    formatearMonto(operacion.montoCentimos, operacion.moneda),
    operacion.ocurridoEn ?? operacion.fecha,
    operacion.codigoOperacion ? `op. ${operacion.codigoOperacion}` : null,
  ];
  return partes.filter(Boolean).join(" · ");
}
