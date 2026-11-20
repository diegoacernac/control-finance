"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  className: string;
  // Sin texto de espera (botones del tema) solo se deshabilita mientras guarda.
  textoEnviando?: string;
  formAction?: (formulario: FormData) => void | Promise<void>;
  "aria-pressed"?: boolean;
};

// Para los formularios con acción de servidor que no usan useActionState
// (Omitir, Eliminar, Guardar en Por revisar...): muestra que algo está pasando
// y evita el doble envío por tocar dos veces.
export function BotonEnviar({ children, className, textoEnviando, formAction, ...resto }: Props) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} formAction={formAction} className={className} {...resto}>
      {pending && textoEnviando ? textoEnviando : children}
    </button>
  );
}
