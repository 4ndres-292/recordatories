/** CREADO: consulta y modifica un recordatorio propio; .ts porque es un Route Handler sin JSX. */
import { requireCurrentUser } from "@/lib/current-user";
import { ApiError, assertSameOrigin, handleApi, jsonResponse, readJson } from "@/lib/http";
import { identifier, updateReminderSchema } from "@/lib/validations/reminders";
import { deleteReminder, getReminder, updateReminder } from "@/services/reminders";

// En esta versión de Next.js los parámetros dinámicos se resuelven mediante una Promise.
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return handleApi(async () => {
    const user = await requireCurrentUser();
    const id = identifier.parse((await context.params).id);
    const reminder = await getReminder(user.id, id);
    return jsonResponse({ reminder }, 200, { ETag: `"${reminder.version}"` });
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleApi(async () => {
    const user = await requireCurrentUser();
    assertSameOrigin(request);
    const id = identifier.parse((await context.params).id);
    const input = updateReminderSchema.parse(await readJson(request));
    const reminder = await updateReminder(user.id, id, input);
    return jsonResponse({ reminder }, 200, { ETag: `"${reminder.version}"` });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleApi(async () => {
    const user = await requireCurrentUser();
    assertSameOrigin(request);
    const id = identifier.parse((await context.params).id);
    // La futura interfaz debe pedir confirmación antes de enviar este encabezado.
    if (request.headers.get("X-Confirm-Delete") !== "true") {
      throw new ApiError(400, "CONFIRMATION_REQUIRED", "Confirma la eliminación antes de continuar.");
    }
    const match = /^"([1-9]\d{0,9})"$/.exec(request.headers.get("If-Match") ?? "");
    const version = Number(match?.[1]);
    if (!match || !Number.isSafeInteger(version) || version > 2147483646) {
      throw new ApiError(428, "VERSION_REQUIRED", 'Envía If-Match con la versión entre comillas, por ejemplo "1".');
    }
    await deleteReminder(user.id, id, version);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  });
}
