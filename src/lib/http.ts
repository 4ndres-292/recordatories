/** CREADO: respuestas y validación HTTP comunes; .ts porque no contiene interfaz JSX. */
import { z } from "zod";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// Las respuestas privadas no pueden reutilizarse desde una caché compartida.
export function jsonResponse(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie");
  return Response.json(data, { status, headers });
}

export async function handleApi(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: {
        code: "VALIDATION_ERROR",
        message: "Revisa los campos enviados.",
        fields: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
      } }, 422);
    }
    if (error instanceof ApiError) {
      return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
    }
    // Nunca devolver SQL, credenciales, tokens o el contenido de las excepciones al navegador.
    return jsonResponse({ error: { code: "INTERNAL_ERROR", message: "No se pudo completar la operación." } }, 500);
  }
}

// NextAuth protege sus propias rutas; este control protege las nuevas mutaciones con cookies frente a CSRF.
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin;
  if (!origin || origin !== expected) {
    throw new ApiError(403, "INVALID_ORIGIN", "El origen de la solicitud no está permitido.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(415, "INVALID_CONTENT_TYPE", "Envía el contenido como application/json.");
  }
  const limit = 16 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON", "El cuerpo JSON es obligatorio.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, "BODY_TOO_LARGE", "El cuerpo no puede superar 16 KiB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "El cuerpo debe ser JSON válido en UTF-8.");
  }
}
