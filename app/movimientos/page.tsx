import { connection } from "next/server";
import Link from "next/link";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { esFechaIsoValida, finDeMes } from "@/lib/fechas/lima.ts";
import { SIN_CATEGORIA } from "@/lib/panel/gasto-por-categoria.ts";
import { diaYMes, nombreDelMes } from "@/lib/fechas/formato.ts";
import { formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import { EditarMovimiento, type MovimientoEditable } from "../_componentes/EditarMovimiento.tsx";
import type { PrevistoDestino } from "../_componentes/SelectorDestino.tsx";
import type { OpcionCategoria } from "@/lib/panel/tipos.ts";
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor.ts";
import panel from "../panel.module.css";
import estilos from "./movimientos.module.css";

export const instant = false;
const POR_PAGINA = 25;

export default async function Movimientos({ searchParams }: PageProps<"/movimientos">) {
  await connection();
  await exigirPropietario();
  const parametros = await searchParams;
  const texto = typeof parametros.q === "string" ? parametros.q.trim().slice(0, 160) : "";
  const { mes, categoria } = parametros;
  const gasto = typeof mes === "string" && esFechaIsoValida(`${mes}-01`) && typeof categoria === "string" && categoria
    ? { mes, categoria }
    : null;
  const numero = Number(parametros.p);
  const pagina = Number.isInteger(numero) && numero >= 1 && numero <= 1_000_000 ? numero : 1;
  const inicio = (pagina - 1) * POR_PAGINA;
  const supabase = crearClienteServidor();
  let consulta = supabase.from("movimientos_con_categoria")
    .select("id, descripcion, fecha, tipo, categoriaNombre:categoria_nombre, previstoNombre:previsto_nombre, montoCentimos:monto_centimos, moneda")
    .order("fecha", { ascending: false }).order("id", { ascending: false });
  if (gasto) {
    const desde = `${gasto.mes}-01`;
    consulta = consulta.eq("tipo", "egreso").eq("moneda", "PEN").eq("cuenta_como_gasto", true)
      .gte("fecha", desde).lte("fecha", finDeMes(desde));
    consulta = gasto.categoria === SIN_CATEGORIA
      ? consulta.or(`categoria_raiz.is.null,categoria_raiz.eq."${SIN_CATEGORIA}"`)
      : consulta.eq("categoria_raiz", gasto.categoria);
  }
  if (texto) {
    const literal = texto.replace(/[\\%_]/g, "\\$&");
    consulta = consulta.ilike("descripcion", `%${literal}%`);
  }
  const { data, error } = await consulta.range(inicio, inicio + POR_PAGINA).overrideTypes<MovimientoEditable[], { merge: false }>();
  if (error) throw new Error("No se pudo cargar el historial de movimientos.");
  const registros = data.slice(0, POR_PAGINA);
  const editando = registros.find(r => String(r.id) === parametros.editar);
  const opciones = editando ? await cargarOpciones(supabase, editando.tipo) : null;
  function enlace(p: number, editar?: number) {
    const filtros = new URLSearchParams(gasto ?? {});
    if (texto) filtros.set("q", texto);
    filtros.set("p", String(p));
    if (editar) filtros.set("editar", String(editar));
    return `/movimientos?${filtros}`;
  }

  return (
    <main className={estilos.pagina}>
      <header className={panel.cabecera}>
        <h1 className={panel.marca}>Movimientos</h1>
        <Link href="/" className={panel.botonTexto}>Volver al panel</Link>
      </header>
      {gasto && (
        <div className={estilos.filtro}>
          <p>Gastos de <strong>{gasto.categoria}</strong> · {nombreDelMes(`${gasto.mes}-01`)} de {gasto.mes.slice(0, 4)}</p>
          <Link href="/movimientos" className={panel.botonTexto}>Ver todo el historial</Link>
        </div>
      )}
      <form action="/movimientos" role="search" className={estilos.busqueda}>
        {gasto && <>
          <input type="hidden" name="categoria" value={gasto.categoria} />
          <input type="hidden" name="mes" value={gasto.mes} />
        </>}
        <label htmlFor="consulta">Buscar por descripción</label>
        <input key={texto} id="consulta" type="search" name="q" defaultValue={texto} maxLength={160}
          placeholder="Ej. taxi" className={panel.registroCampo} />
        <button className={panel.boton}>Buscar</button>
      </form>
      {texto && <Link href={{ pathname: "/movimientos", query: gasto ?? {} }} className={panel.botonTexto}>Quitar búsqueda</Link>}
      {registros.length ? (
        <ul className={panel.lista}>
          {registros.map((r) => (
            <li key={r.id} className={estilos.registro}>
              <time dateTime={r.fecha}>{diaYMes(r.fecha)} {r.fecha.slice(0, 4)}</time>
              <div className={estilos.descripcion}>
                {r.descripcion}
                <small>{r.previstoNombre ?? r.categoriaNombre ?? "Sin categoría"}</small>
              </div>
              <span className={r.tipo === "ingreso" ? panel.ingreso : panel.egreso}>
                {r.tipo === "ingreso" ? "+" : "−"} {formatearMonto(r.montoCentimos, r.moneda)}
              </span>
              <div className={estilos.edicion}>
                {editando?.id === r.id && opciones ? (
                  <>
                    <Link href={enlace(pagina)} scroll={false} className={panel.botonTexto}>Cerrar edición</Link>
                    <EditarMovimiento movimiento={r} previstosAbiertos={opciones.previstos} categorias={opciones.categorias} />
                  </>
                ) : <Link href={enlace(pagina, r.id)} scroll={false} prefetch={false} className={panel.botonTexto} aria-label={`Editar ${r.descripcion}`}>Editar</Link>}
              </div>
            </li>
          ))}
        </ul>
      ) : <p>{pagina > 1 ? "No hay más movimientos en esta página." : texto ? "Ningún movimiento coincide con tu búsqueda." : gasto ? "No hay gastos para esta categoría en este mes." : "Todavía no hay movimientos."}</p>}
      {(pagina > 1 || data.length > POR_PAGINA) && (
        <nav aria-label="Páginas del historial" className={estilos.paginacion}>
          {pagina > 1 && <Link href={enlace(pagina - 1)}>Anterior</Link>}
          <span>Página {pagina}</span>
          {data.length > POR_PAGINA && <Link href={enlace(pagina + 1)}>Siguiente</Link>}
        </nav>
      )}
    </main>
  );
}

async function cargarOpciones(supabase: ReturnType<typeof crearClienteServidor>, tipo: MovimientoEditable["tipo"]) {
  const [previstos, categorias] = await Promise.all([
    supabase.from("previstos_con_pago").select("id, tipo, nombre, persona, fechaEsperada:fecha_esperada")
      .eq("tipo", tipo).in("estado", ["pendiente", "parcial"]).order("fecha_esperada").order("id")
      .overrideTypes<PrevistoDestino[], { merge: false }>(),
    supabase.from("categorias_con_nombre").select("id, tipo, nombre:nombre_completo")
      .eq("tipo", tipo).order("nombre_completo").overrideTypes<OpcionCategoria[], { merge: false }>(),
  ]);
  if (previstos.error || categorias.error) throw new Error("No se pudieron cargar las opciones de edición.");
  return { previstos: previstos.data, categorias: categorias.data };
}
