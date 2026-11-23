import { describe, expect, it } from "vitest";
import { weekSessions, streak, progress, type Session } from "@/lib/study";
const session = (fecha: string): Session => ({
  id: fecha,
  subject_id: "subject",
  fecha,
  duracion_minutos: 60,
  nota: null,
});
describe("Reglas de estudio", () => {
  it("cuenta días consecutivos con al menos una sesión, sin duplicar días", () => {
    expect(
      streak(
        [
          session("2026-11-23"),
          session("2026-11-23"),
          session("2026-11-22"),
          session("2026-11-21"),
          session("2026-11-19"),
        ],
        new Date(2026, 10, 23, 12),
      ),
    ).toBe(3);
    expect(streak([session("2026-11-21")], new Date(2026, 10, 23, 12))).toBe(0);
    expect(streak([session("2026-11-22"), session("2026-11-21")], new Date(2026, 10, 23, 12))).toBe(
      2,
    );
  });
  it("las semanas incluyen lunes a domingo", () => {
    const selected = weekSessions(
      ["2026-11-22", "2026-11-23", "2026-11-29", "2026-11-30"].map(session),
      new Date(2026, 10, 25, 12),
    );
    expect(selected.map((s) => s.fecha)).toEqual(["2026-11-23", "2026-11-29"]);
  });
  it("el cumplimiento es horas estudiadas dividido por la meta por materia y global", () => {
    expect(progress(3, 6)).toBe(50);
    expect(progress(3 + 5, 6 + 4)).toBe(80);
    expect(progress(8, 4)).toBe(200);
  });
});
