/** CREADO: contratos de entrada del CRUD; .ts para compartir tipos y reglas sin JSX. */
import { z } from "zod";

export const reminderCategory = z.enum(["PAYMENT", "PERSONAL", "MEETING", "EXPENSE"]);
export const reminderStatus = z.enum(["PENDING", "COMPLETED", "CANCELLED"]);
export const reminderPriority = z.enum(["LOW", "NORMAL", "HIGH"]);
export const identifier = z.uuid();
export const timezone = z.string().min(1).max(100).refine(value => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value === "UTC" || value.includes("/");
  } catch {
    return false;
  }
}, "Utiliza una zona IANA válida, por ejemplo America/La_Paz.");

const dateTime = z.iso.datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)), "Fecha inválida.");
const offsets = z.array(z.number().int().min(0).max(525600)).min(1).max(5)
  .refine(values => new Set(values).size === values.length, "No repitas anticipaciones.")
  .transform(values => [...values].sort((a, b) => a - b));

const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable(),
  category: reminderCategory,
  priority: reminderPriority,
  dueAt: dateTime.nullable(),
  dueDate: z.iso.date().nullable(),
  timezone,
  notificationOffsetsMinutes: offsets,
};

export const createReminderSchema = z.strictObject({
  ...fields,
  description: fields.description.default(null),
  category: fields.category.default("PERSONAL"),
  priority: fields.priority.default("NORMAL"),
  dueAt: fields.dueAt.default(null),
  dueDate: fields.dueDate.default(null),
  timezone: fields.timezone.default("America/La_Paz"),
  notificationOffsetsMinutes: fields.notificationOffsetsMinutes.default([0]),
}).refine(value => Boolean(value.dueAt) !== Boolean(value.dueDate), {
  message: "Indica dueAt con hora o dueDate sin hora, pero no ambos.", path: ["dueAt"],
});

// La versión es obligatoria para evitar sobrescribir silenciosamente una edición simultánea.
export const updateReminderSchema = z.strictObject({
  title: fields.title.optional(),
  description: fields.description.optional(),
  category: fields.category.optional(),
  priority: fields.priority.optional(),
  dueAt: fields.dueAt.optional(),
  dueDate: fields.dueDate.optional(),
  timezone: fields.timezone.optional(),
  notificationOffsetsMinutes: fields.notificationOffsetsMinutes.optional(),
  status: reminderStatus.optional(),
  version: z.number().int().min(1).max(2147483646),
}).refine(value => Object.keys(value).some(key => key !== "version"), "Envía al menos un campo para modificar.");

export const listRemindersSchema = z.strictObject({
  category: reminderCategory.optional(),
  status: reminderStatus.optional(),
  priority: reminderPriority.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  timezone: timezone.default("America/La_Paz"),
  overdue: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(value => !value.from || !value.to || value.from <= value.to, "from debe ser anterior o igual a to.");

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type ListRemindersInput = z.infer<typeof listRemindersSchema>;
