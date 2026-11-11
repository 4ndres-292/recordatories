/**
 * Estado respecto al último commit: CREADO para exponer la API de autenticación.
 * En esta revisión se añaden comentarios para estudiar la implementación.
 * Propósito: entregar a NextAuth las peticiones de acceso, retorno de Google,
 * consulta de sesión y cierre de sesión bajo /api/auth/.
 * route.ts es la convención de Next.js para responder peticiones HTTP.
 * La carpeta [...nextauth] captura varios segmentos, por ejemplo signin/google
 * y callback/google, para que una sola implementación atienda esas operaciones.
 * Extensión .ts: contiene lógica TypeScript sin JSX; responde HTTP, no dibuja UI.
 * Usar .tsx no aporta nada aquí; la convención documentada para esta ruta es route.ts.
 */

// Importa la función de NextAuth que construye el manejador HTTP para el App Router.
import NextAuth from "next-auth";

// Importa las opciones compartidas; el alias @/ apunta a src/ según tsconfig.json y evita rutas relativas largas.
import { authOptions } from "@/lib/auth";

// Configura un único manejador con Google y el secreto; la biblioteca decide cómo responder a cada operación.
const handler = NextAuth(authOptions);

// Next.js exige exportaciones por método HTTP; ambos alias reutilizan el manejador sin duplicar su configuración.
export { handler as GET, handler as POST };
