/** CREADO: vincula la identidad verificada por Google con un usuario local; .ts sin JSX. */
import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";

const googleIdentitySchema = z.strictObject({
  googleSubject: z.string().min(1).max(255),
  name: z.string().max(200).nullable(),
  email: z.email().max(320).nullable(),
  image: z.url().max(2048).nullable(),
});

// Solo recibe datos de los callbacks de NextAuth; no es un endpoint de registro público.
export async function syncGoogleUser(identity: z.infer<typeof googleIdentitySchema>) {
  const data = googleIdentitySchema.parse(identity);
  return getDb().user.upsert({
    where: { googleSubject: data.googleSubject },
    create: data,
    update: { name: data.name, email: data.email, image: data.image },
    select: { id: true },
  });
}
