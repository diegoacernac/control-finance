import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { leerTema } from "@/lib/tema.ts";
import "./globals.css";

const fuenteTitulo = Fraunces({
  variable: "--fuente-titulo",
  subsets: ["latin"],
});

const fuenteDatos = IBM_Plex_Mono({
  variable: "--fuente-datos",
  weight: ["400", "500"],
  subsets: ["latin"],
});

// Todas las páginas dependen de la sesión y de datos al momento: no hay nada
// que prerenderizar, así que se permite que rendericen bloqueando en el servidor.
export const instant = false;

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Control de finanzas personales",
  robots: { index: false, follow: false },
};

const COLOR_PAPEL_CLARO = "#f4efe6";
const COLOR_PAPEL_OSCURO = "#171411";

// El color de la barra del navegador sigue el tema elegido, no solo el del sistema.
export async function generateViewport(): Promise<Viewport> {
  const tema = await leerTema();
  if (tema === "claro") return { themeColor: COLOR_PAPEL_CLARO, colorScheme: "light" };
  if (tema === "oscuro") return { themeColor: COLOR_PAPEL_OSCURO, colorScheme: "dark" };

  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: COLOR_PAPEL_CLARO },
      { media: "(prefers-color-scheme: dark)", color: COLOR_PAPEL_OSCURO },
    ],
  };
}

// El tema se lee en el servidor y va en el HTML: así no hay parpadeo al cargar.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tema = await leerTema();

  return (
    <html
      lang="es"
      data-tema={tema === "auto" ? undefined : tema}
      className={`${fuenteTitulo.variable} ${fuenteDatos.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
