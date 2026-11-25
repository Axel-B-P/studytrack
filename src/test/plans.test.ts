import { describe, it, expect } from "vitest";
import { planProgress, planSchema } from "@/lib/plans";
describe("planes", () => {
  it("progreso = tareas completadas / total", () => {
    expect(planProgress([{ completada: true }, { completada: false }, { completada: false }, { completada: true }])).toBe(50);
    expect(planProgress([])).toBe(0);
  });
  it("rechaza fin antes del inicio", () => {
    expect(planSchema.safeParse({ titulo: "x", objetivo: "", subject_id: "", fecha_inicio: "2026-05-10", fecha_fin: "2026-05-01" }).success).toBe(false);
  });
});
