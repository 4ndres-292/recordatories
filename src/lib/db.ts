/** CREADO: conexión del servidor; .ts porque no renderiza JSX. Nunca importar desde componentes cliente. */
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/http";

const databaseGlobal = globalThis as unknown as { recordatoriesDb?: PrismaClient };

// Inicialización diferida: importar un módulo durante build no abre conexiones.
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new ApiError(503, "DATABASE_UNAVAILABLE", "La base de datos no está configurada.");
  }

  if (!databaseGlobal.recordatoriesDb) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // Reutiliza el pool durante recargas de desarrollo y peticiones de la misma instancia.
    databaseGlobal.recordatoriesDb = new PrismaClient({ adapter });
  }
  return databaseGlobal.recordatoriesDb;
}
