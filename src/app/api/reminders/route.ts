/** CREADO: colección privada del CRUD; .ts porque responde HTTP y no renderiza JSX. */
import { requireCurrentUser } from "@/lib/current-user";
import { ApiError, assertSameOrigin, handleApi, jsonResponse, readJson } from "@/lib/http";
import { createReminderSchema, identifier, listRemindersSchema } from "@/lib/validations/reminders";
import { createReminder, listReminders } from "@/services/reminders";

export async function GET(request: Request) {
  return handleApi(async () => {
    const user = await requireCurrentUser();
    const query = new URL(request.url).searchParams;
    if (new Set(query.keys()).size !== Array.from(query).length) {
      throw new ApiError(400, "DUPLICATE_FILTER", "No repitas parámetros de consulta.");
    }
    const filters = listRemindersSchema.parse({ timezone: user.timezone, ...Object.fromEntries(query) });
    return jsonResponse(await listReminders(user.id, filters));
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const user = await requireCurrentUser();
    assertSameOrigin(request);
    const key = identifier.parse(request.headers.get("Idempotency-Key"));
    const input = createReminderSchema.parse(await readJson(request));
    const result = await createReminder(user.id, input, key);
    return jsonResponse({ reminder: result.reminder }, result.replayed ? 200 : 201, {
      Location: `/api/reminders/${result.reminder.id}`,
      "Idempotency-Replayed": String(result.replayed),
    });
  });
}
