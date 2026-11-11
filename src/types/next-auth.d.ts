/** CREADO: amplía los tipos de NextAuth; .d.ts declara tipos, no genera código ejecutable. */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id?: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Opcional porque los tokens emitidos antes de esta fase todavía pueden existir.
    localUserId?: string;
  }
}
