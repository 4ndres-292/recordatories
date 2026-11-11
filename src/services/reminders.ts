/** CREADO: reglas y acceso a recordatorios propios; .ts porque es lógica de negocio sin JSX. */
import "server-only";
import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { Prisma, type Reminder } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { ApiError } from "@/lib/http";
import {
  createReminderSchema, updateReminderSchema, listRemindersSchema, identifier,
  type CreateReminderInput, type UpdateReminderInput, type ListRemindersInput,
} from "@/lib/validations/reminders";

function localDay(value: Date, zone: string) {
  return DateTime.fromJSDate(value, { zone }).toISODate()!;
}

function requireExistingLocalDate(date: string | null, zone: string) {
  if (date && DateTime.fromISO(date, { zone }).toISODate() !== date) {
    throw new ApiError(422, "INVALID_LOCAL_DATE", "Esa fecha no existe en la zona horaria indicada.");
  }
}

// Nunca guarda un estado OVERDUE: deriva el vencimiento usando el instante o la fecha local.
function serializeReminder(reminder: Reminder, now = new Date()) {
  const dueDate = reminder.dueDate?.toISOString().slice(0, 10) ?? null;
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    category: reminder.category,
    status: reminder.status,
    priority: reminder.priority,
    dueAt: reminder.dueAt?.toISOString() ?? null,
    dueDate,
    timezone: reminder.timezone,
    notificationOffsetsMinutes: reminder.notificationOffsetsMinutes,
    recurrenceRule: reminder.recurrenceRule,
    completedAt: reminder.completedAt?.toISOString() ?? null,
    version: reminder.version,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
    isOverdue: reminder.status === "PENDING" && (reminder.dueAt
      ? reminder.dueAt.getTime() < now.getTime()
      : Boolean(dueDate && dueDate < localDay(now, reminder.timezone))),
  };
}

function persistedSchedule(input: CreateReminderInput) {
  requireExistingLocalDate(input.dueDate, input.timezone);
  return {
    ...input,
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
  };
}

export async function createReminder(userId: string, input: CreateReminderInput, key: string) {
  identifier.parse(userId);
  identifier.parse(key);
  const data = createReminderSchema.parse(input);
  const schedule = persistedSchedule(data);
  const hash = createHash("sha256").update(JSON.stringify(schedule)).digest("hex");
  try {
    const reminder = await getDb().reminder.create({
      data: { ...schedule, userId, createKey: key, createPayloadHash: hash },
    });
    return { reminder: serializeReminder(reminder), replayed: false };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const previous = await getDb().reminder.findUnique({ where: { userId_createKey: { userId, createKey: key } } });
    if (!previous || previous.createPayloadHash !== hash) {
      throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Esta clave ya se utilizó para otro contenido.");
    }
    return { reminder: serializeReminder(previous), replayed: true };
  }
}

async function findOwnedReminder(userId: string, id: string) {
  identifier.parse(userId);
  identifier.parse(id);
  const reminder = await getDb().reminder.findFirst({ where: { id, userId } });
  // La misma respuesta para inexistente y ajeno evita revelar la existencia de otros registros.
  if (!reminder) throw new ApiError(404, "NOT_FOUND", "No se encontró el recordatorio.");
  return reminder;
}

export async function getReminder(userId: string, id: string) {
  return serializeReminder(await findOwnedReminder(userId, id));
}

export async function updateReminder(userId: string, id: string, input: UpdateReminderInput) {
  const patch = updateReminderSchema.parse(input);
  const previous = await findOwnedReminder(userId, id);
  if (previous.version !== patch.version) throw new ApiError(409, "VERSION_CONFLICT", "El recordatorio cambió; vuelve a cargarlo.");
  // Valida el estado final completo; una edición parcial no puede dejar dos fechas o ninguna.
  const schedule = persistedSchedule(createReminderSchema.parse({
    title: patch.title ?? previous.title,
    description: patch.description !== undefined ? patch.description : previous.description,
    category: patch.category ?? previous.category,
    priority: patch.priority ?? previous.priority,
    dueAt: patch.dueAt !== undefined ? patch.dueAt : previous.dueAt?.toISOString() ?? null,
    dueDate: patch.dueDate !== undefined ? patch.dueDate : previous.dueDate?.toISOString().slice(0, 10) ?? null,
    timezone: patch.timezone ?? previous.timezone,
    notificationOffsetsMinutes: patch.notificationOffsetsMinutes ?? previous.notificationOffsetsMinutes,
  }));
  const status = patch.status ?? previous.status;
  const completedAt = status === "COMPLETED" ? previous.completedAt ?? new Date() : null;
  // El filtro de versión se aplica en la escritura, no solo en la lectura, para cerrar la carrera entre ambas.
  const updated = await getDb().reminder.updateManyAndReturn({
    where: { id, userId, version: patch.version },
    data: { ...schedule, status, completedAt, version: { increment: 1 } },
  });
  if (!updated[0]) throw new ApiError(409, "VERSION_CONFLICT", "El recordatorio cambió; vuelve a cargarlo.");
  return serializeReminder(updated[0]);
}

export async function deleteReminder(userId: string, id: string, version: number) {
  const previous = await findOwnedReminder(userId, id);
  if (previous.version !== version) throw new ApiError(409, "VERSION_CONFLICT", "El recordatorio cambió; vuelve a cargarlo.");
  const deleted = await getDb().reminder.deleteMany({ where: { id, userId, version } });
  if (!deleted.count) throw new ApiError(409, "VERSION_CONFLICT", "El recordatorio cambió; vuelve a cargarlo.");
}

export async function listReminders(userId: string, input: ListRemindersInput) {
  identifier.parse(userId);
  const filters = listRemindersSchema.parse(input);
  const now = new Date();
  const clauses: Prisma.ReminderWhereInput[] = [{ userId }];
  if (filters.status) clauses.push({ status: filters.status });
  if (filters.category) clauses.push({ category: filters.category });
  if (filters.priority) clauses.push({ priority: filters.priority });
  if (filters.from || filters.to) {
    const start = filters.from ? DateTime.fromISO(filters.from, { zone: filters.timezone }).startOf("day") : null;
    const end = filters.to ? DateTime.fromISO(filters.to, { zone: filters.timezone }).plus({ days: 1 }).startOf("day") : null;
    requireExistingLocalDate(filters.from ?? null, filters.timezone);
    requireExistingLocalDate(filters.to ?? null, filters.timezone);
    clauses.push({ OR: [
      { dueAt: { ...(start ? { gte: start.toJSDate() } : {}), ...(end ? { lt: end.toJSDate() } : {}) } },
      { dueDate: {
        ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00Z`) } : {}),
        ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00Z`) } : {}),
      } },
    ] });
  }
  if (filters.overdue !== undefined) {
    // Agrupa solo las zonas usadas por este propietario; cada fecha sin hora vence al acabar su propio día local.
    const zones = await getDb().reminder.groupBy({ by: ["timezone"], where: { userId, dueDate: { not: null }, status: "PENDING" } });
    const overdue: Prisma.ReminderWhereInput = { status: "PENDING", OR: [
      { dueAt: { not: null, lt: now } },
      ...zones.map(({ timezone }) => ({ timezone, dueDate: { not: null, lt: new Date(`${localDay(now, timezone)}T00:00:00Z`) } })),
    ] };
    clauses.push(filters.overdue === "true" ? overdue : { NOT: overdue });
  }
  const where: Prisma.ReminderWhereInput = { AND: clauses };
  // Una instantánea mantiene coherentes el total y la página si se crean registros mientras se consulta.
  const [total, reminders] = await getDb().$transaction([
    getDb().reminder.count({ where }),
    getDb().reminder.findMany({ where, skip: (filters.page - 1) * filters.limit, take: filters.limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ], { isolationLevel: "RepeatableRead" });
  return { reminders: reminders.map(reminder => serializeReminder(reminder, now)),
    pagination: { page: filters.page, limit: filters.limit, total, pages: Math.ceil(total / filters.limit) } };
}
