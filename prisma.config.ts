/** CREADO: configura la CLI de Prisma 7; .ts porque es configuración tipada sin JSX. */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // generate y build no necesitan conexión; migrate exige una URL real al ejecutarse.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
