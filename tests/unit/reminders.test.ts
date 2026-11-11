/** CREADO: comprueba contratos de datos sin base de datos ni servicios externos. */
import { describe, expect, it } from "vitest";
import { createReminderSchema, updateReminderSchema, listRemindersSchema } from "@/lib/validations/reminders";

const input = { title: "Pagar internet", dueDate: "2026-11-20" };

describe("contratos de recordatorios", () => {
  it("conserva una fecha sin inventar una hora y aplica valores iniciales", () => {
    expect(createReminderSchema.parse(input)).toMatchObject({ title: input.title, dueDate: input.dueDate,
      dueAt: null, timezone: "America/La_Paz", category: "PERSONAL", priority: "NORMAL" });
  });
  it.each([
    { title: "  ", dueDate: "2026-11-20" },
    { title: "Sin fecha" },
    { ...input, dueAt: "2026-11-20T09:00:00-04:00" },
    { ...input, dueDate: "2026-02-30" },
    { title: "Sin zona", dueAt: "2026-11-20T09:00:00" },
    { ...input, timezone: "zona/inexistente" },
    { ...input, userId: "inyectado" },
    { ...input, status: "COMPLETED" },
    { ...input, recurrenceRule: "FREQ=DAILY" },
    { ...input, notificationOffsetsMinutes: [-1] },
    { ...input, notificationOffsetsMinutes: [0, 0] },
  ])("rechaza datos incompletos, inválidos o campos reservados: %j", value => {
    expect(createReminderSchema.safeParse(value).success).toBe(false);
  });
  it("acepta un instante con desplazamiento explícito", () => {
    expect(createReminderSchema.parse({ title: "Reunión", dueAt: "2026-11-20T09:00:00-04:00" }).dueAt)
      .toBe("2026-11-20T09:00:00-04:00");
  });
  it("ordena anticipaciones sin modificar la lista original", () => {
    const values = [1440, 0, 60];
    expect(createReminderSchema.parse({ ...input, notificationOffsetsMinutes: values }).notificationOffsetsMinutes)
      .toEqual([0, 60, 1440]);
    expect(values).toEqual([1440, 0, 60]);
  });
  it("exige versión y campos para editar", () => {
    expect(updateReminderSchema.safeParse({ title: "Cambio" }).success).toBe(false);
    expect(updateReminderSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(updateReminderSchema.safeParse({ version: 1, status: "COMPLETED" }).success).toBe(true);
  });
  it("limita paginación, valida intervalos y rechaza filtros desconocidos", () => {
    expect(listRemindersSchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(listRemindersSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listRemindersSchema.safeParse({ from: "2026-11-30", to: "2026-11-01" }).success).toBe(false);
    expect(listRemindersSchema.safeParse({ userId: "otro" }).success).toBe(false);
    expect(listRemindersSchema.parse({ page: "2", limit: "10", overdue: "false" })).toMatchObject({ page: 2, limit: 10 });
  });
});
