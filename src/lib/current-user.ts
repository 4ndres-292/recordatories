/** CREADO: autorización central del servidor; .ts porque no representa elementos visuales. */
import "server-only";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ApiError } from "@/lib/http";

export async function requireCurrentUser() {
  const session = await getServerSession(authOptions);
  const id = z.uuid().safeParse(session?.user?.id);
  if (!id.success) {
    // Una sesión anterior a la persistencia debe renovarse con Google, no asociarse por su correo.
    throw new ApiError(401, "UNAUTHORIZED", "Inicia sesión con Google para continuar.");
  }
  const user = await getDb().user.findUnique({
    where: { id: id.data }, select: { id: true, timezone: true },
  });
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "La sesión ya no corresponde a un usuario activo.");
  return user;
}
