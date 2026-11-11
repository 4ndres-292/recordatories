/** CREADO: verifica límites de entrada, protección de origen y errores sin información sensible. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, assertSameOrigin, handleApi, readJson } from "@/lib/http";

afterEach(() => vi.unstubAllEnvs());

describe("HTTP privado", () => {
  it("exige el origen configurado para mutaciones", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://recordatories.example");
    expect(() => assertSameOrigin(new Request("http://internal/api", { headers: { Origin: "https://recordatories.example" } })))
      .not.toThrow();
    for (const origin of [undefined, "https://evil.example", "null"]) {
      expect(() => assertSameOrigin(new Request("http://internal/api", { headers: origin ? { Origin: origin } : {} })))
        .toThrow(ApiError);
    }
  });
  it("acepta JSON UTF-8", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Reunión" }) });
    expect(await readJson(request)).toEqual({ title: "Reunión" });
  });
  it("rechaza contenido no JSON y JSON malformado", async () => {
    await expect(readJson(new Request("http://localhost", { method: "POST", body: "texto" }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })))
      .rejects.toMatchObject({ status: 400 });
  });
  it("limita también cuerpos sin Content-Length confiable", async () => {
    const request = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(17000) }) });
    await expect(readJson(request)).rejects.toMatchObject({ status: 413 });
  });
  it("no revela excepciones y deshabilita caché", async () => {
    const response = await handleApi(async () => { throw new Error("postgres://usuario:secreto@privado"); });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secreto");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
