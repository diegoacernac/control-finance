import { connection } from "next/server";
import Link from "next/link";
import { exigirPropietario } from "@/lib/auth/propietario.ts";
import { esFechaIsoValida, finDeMes } from "@/lib/fechas/lima.ts";
import { SIN_CATEGORIA } from "@/lib/panel/gasto-por-categoria.ts";
import { diaYMes, nombreDelMes } from "@/lib/fechas/formato.ts";
import { formatearMonto } from "@/lib/movimientos/formato-monto.ts";
import type { Moneda } from "@/lib/movimientos/tipos.ts";
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor.ts";
import panel from "../panel.module.css";
import estilos from "./movimientos.module.css";

export const instant = false;
const POR_PAGINA = 25;

type Registro = {
  id: number;
  descripcion: string;
  fecha: string;
  tipo: "ingreso" | "egreso";
  categoria_nombre: string | null;
  previsto_nombre: string | null;
  monto_centimos: number;
  moneda: Moneda;
};

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
  let consulta = crearClienteServidor().from("movimientos_con_categoria")
    .select("id, descripcion, fecha, tipo, categoria_nombre, previsto_nombre, monto_centimos, moneda")
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
  const { data, error } = await consulta.range(inicio, inicio + POR_PAGINA).overrideTypes<Registro[], { merge: false }>();
  if (error) throw new Error("No se pudo cargar el historial de movimientos.");
  const registros = data.slice(0, POR_PAGINA);
  function enlace(p: number) {
    const filtros = new URLSearchParams(gasto ?? {});
    if (texto) filtros.set("q", texto);
    filtros.set("p", String(p));
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
                <small>{r.previsto_nombre ?? r.categoria_nombre ?? "Sin categoría"}</small>
              </div>
              <span className={r.tipo === "ingreso" ? panel.ingreso : panel.egreso}>
                {r.tipo === "ingreso" ? "+" : "−"} {formatearMonto(r.monto_centimos, r.moneda)}
              </span>
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
