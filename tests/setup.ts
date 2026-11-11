// CREADO: el marcador server-only lo interpreta Next.js; en pruebas de Node se sustituye por un módulo vacío.
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
