/**
 * Estado respecto al último commit: CREADO para configurar el acceso con Google.
 * MODIFICADO en la fase 1 para validar configuración y vincular Google con PostgreSQL.
 * Propósito: reunir las opciones de NextAuth que consume la ruta de autenticación.
 * Se separan de route.ts para poder reutilizarlas en futuras consultas del servidor.
 * Extensión .ts: contiene TypeScript sin JSX; no representa una interfaz visual.
 * .tsx permite JSX, pero no es necesario aquí. La extensión no determina si un
 * archivo es de cliente o servidor: este se usa desde la ruta del servidor.
 * Flujo: route.ts importa authOptions y NextAuth las usa para gestionar el acceso.
 */

// Importa solamente el tipo de las opciones: detecta errores al desarrollar y se elimina al compilar.
import type { NextAuthOptions } from "next-auth";
// Importa la configuración OAuth de Google de la biblioteca para no implementar ese protocolo manualmente.
import GoogleProvider from "next-auth/providers/google";
// Zod valida la configuración; la extensión .ts continúa siendo adecuada porque no hay JSX.
import { z } from "zod";
// El servicio persiste solo identidad y perfil; no guarda los tokens de acceso de Google.
import { syncGoogleUser } from "@/services/users";

// Falla de forma explícita si falta configuración, en vez de confiar únicamente en el operador ! de TypeScript.
const environment = z.object({
  googleId: z.string().trim().min(1),
  googleSecret: z.string().trim().min(1),
  secret: z.string().trim().min(32),
}).parse({
  googleId: process.env.AUTH_GOOGLE_ID,
  googleSecret: process.env.AUTH_GOOGLE_SECRET,
  secret: process.env.AUTH_SECRET,
});

// Exporta un objeto reutilizable; const evita reasignarlo y NextAuthOptions comprueba sus propiedades.
export const authOptions: NextAuthOptions = {
  // NextAuth recibe una lista de proveedores, aunque por ahora solo habilitamos Google.
  providers: [
    // Crea las opciones de Google: identificador, credencial y valores OAuth predeterminados de la biblioteca.
    GoogleProvider({
      // Usa el identificador comprobado en el servidor; nunca se recibe desde un formulario.
      clientId: environment.googleId,
      // Entrega a la biblioteca la credencial privada validada para completar OAuth con Google.
      clientSecret: environment.googleSecret,
    }), // Cierra las opciones y la llamada al proveedor; la coma permite añadir otro proveedor a la lista.
  ], // Termina la lista: en esta implementación no se habilitan otros métodos de acceso.
  // Proporciona el secreto con el que NextAuth protege tokens y cookies; se lee del entorno para no fijarlo en el código.
  secret: environment.secret,
  // Conserva las sesiones JWT existentes; añadir usuarios persistentes no requiere cambiar a sesiones de base de datos.
  session: { strategy: "jwt" },
  // Los callbacks se ejecutan en el servidor; nunca confían en un userId enviado por el navegador.
  callbacks: {
    // Al iniciar sesión, Google ya fue validado por NextAuth y proporciona su identificador estable.
    async jwt({ token, account, user }) {
      // Solo el evento OAuth puede crear o actualizar la vinculación; una actualización de sesión cliente no puede hacerlo.
      if (account?.provider === "google" && user) {
        // upsert evita crear dos usuarios cuando una misma cuenta vuelve a entrar.
        const localUser = await syncGoogleUser({
          googleSubject: account.providerAccountId,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
        });
        // Guarda el id local en el JWT cifrado, sin incluir credenciales del proveedor.
        token.localUserId = localUser.id;
      }
      // Las sesiones antiguas siguen sin id local y deberán iniciar sesión de nuevo para usar el CRUD.
      return token;
    },
    // Expone al cliente solamente el id local; la autorización real se vuelve a comprobar en cada endpoint.
    async session({ session, token }) {
      // La comprobación de tipo conserva compatibilidad con tokens anteriores a esta fase.
      if (session.user && typeof token.localUserId === "string") session.user.id = token.localUserId;
      // NextAuth entrega el objeto de sesión al proveedor cliente.
      return session;
    },
  },
}; // Termina el objeto de configuración; no inicia sesión por sí mismo.
