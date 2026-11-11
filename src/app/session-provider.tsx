/**
 * Estado respecto al último commit: CREADO para compartir la sesión en la interfaz.
 * En esta revisión se añaden comentarios para estudiar la implementación.
 * Propósito: permitir que los componentes descendientes usen useSession().
 * Este envoltorio concentra la parte cliente sin convertir todo layout.tsx en
 * un componente cliente; así el layout puede seguir exportando sus metadatos.
 * Extensión .tsx: combina tipos de TypeScript con JSX, como <SessionProvider>.
 * Un archivo .ts no admite esa sintaxis JSX; .tsx no significa por sí solo cliente.
 * Flujo: layout.tsx envuelve las páginas con este componente y page.tsx lee la sesión.
 */

// Declara la frontera de cliente antes de los imports: SessionProvider utiliza el contexto de React.
"use client";

// Reutiliza el proveedor de NextAuth para compartir y actualizar la sesión sin crear un contexto propio.
import { SessionProvider } from "next-auth/react";

// Exporta el envoltorio; extrae children de las props y ReactNode admite el contenido que React puede renderizar.
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  // Envuelve el contenido sin añadir una etiqueta HTML; al no pasar una sesión inicial, el proveedor la consulta.
  return <SessionProvider>{children}</SessionProvider>;
} // Cierra el componente reutilizado por el layout principal.
