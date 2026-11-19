"use client";

import { useActionState, useState } from "react";
import type { TipoMovimiento } from "@/lib/movimientos/tipos.ts";
import type { OpcionCategoria } from "@/lib/panel/tipos.ts";
import estilosPanel from "../../panel.module.css";
import { planearPrevisto } from "../acciones.ts";

type Props = { categorias: OpcionCategoria[]; hoy: string };

export function FormularioPlaneado({ categorias, hoy }: Props) {
  const [resultado, accion, enviando] = useActionState(planearPrevisto, null);
  const [tipo, setTipo] = useState<TipoMovimiento>("egreso");
  const delTipo = categorias.filter((categoria) => categoria.tipo === tipo);

  return (
    <form action={accion} className={estilosPanel.formularioEdicion}>
      <div className={`${estilosPanel.campoEdicion} ${estilosPanel.campoAncho}`}>
        <label htmlFor="planeado-nombre">Qué</label>
        <input
          id="planeado-nombre"
          name="nombre"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="Viaje Cusco"
          className={estilosPanel.selector}
        />
      </div>
      <div className={estilosPanel.campoEdicion}>
        <label htmlFor="planeado-tipo">Es</label>
        <select
          id="planeado-tipo"
          name="tipo"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value as TipoMovimiento)}
          className={estilosPanel.selector}
        >
          <option value="egreso">Un gasto</option>
          <option value="ingreso">Un ingreso</option>
        </select>
      </div>
      <div className={estilosPanel.campoEdicion}>
        <label htmlFor="planeado-categoria">Categoría</label>
        {/* key: al cambiar el tipo, la lista cambia y vuelve a la primera opción. */}
        <select key={tipo} id="planeado-categoria" name="categoria" required className={estilosPanel.selector}>
          {delTipo.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={estilosPanel.campoEdicion}>
        <label htmlFor="planeado-monto">Monto (S/)</label>
        <input id="planeado-monto" name="monto" required inputMode="decimal" placeholder="1500" className={estilosPanel.selector} />
      </div>
      <div className={estilosPanel.campoEdicion}>
        <label htmlFor="planeado-fecha">Cuándo</label>
        <input id="planeado-fecha" name="fecha" type="date" required min={hoy} className={estilosPanel.selector} />
      </div>

      <div className={estilosPanel.pieEdicion}>
        <button type="submit" disabled={enviando} className={estilosPanel.boton}>
          {enviando ? "Anotando…" : "Anotar"}
        </button>
        <p role="status" className={resultado?.ok === false ? estilosPanel.mensajeError : estilosPanel.mensajeOk}>
          {resultado?.mensaje}
        </p>
      </div>
    </form>
  );
}
