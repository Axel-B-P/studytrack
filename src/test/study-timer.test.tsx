import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudyTimerProvider, useStudyTimer } from "@/components/study/timer-state";

let timer!: ReturnType<typeof useStudyTimer>;

function TimerProbe() {
  timer = useStudyTimer();
  return <output aria-label="Segundos">{timer.seconds}</output>;
}

describe("StudyTimerProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("conserva la sesión y el tiempo transcurrido al cambiar de sección", () => {
    const view = render(
      <StudyTimerProvider>
        <TimerProbe />
      </StudyTimerProvider>,
    );

    act(() => {
      timer.setSubject("materia-1");
      timer.setStart(Date.now() - 5000);
      timer.setRunning(true);
      timer.setSeconds(5);
    });

    view.rerender(
      <StudyTimerProvider>
        <span>Otra sección</span>
      </StudyTimerProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    view.rerender(
      <StudyTimerProvider>
        <TimerProbe />
      </StudyTimerProvider>,
    );

    expect(screen.getByLabelText("Segundos")).toHaveTextContent("7");
    expect(timer.subject).toBe("materia-1");
    expect(timer.running).toBe(true);
    expect(timer.start).toBe(Date.now() - 7000);
  });

  it("conserva la sesión que espera una nota al cambiar de sección", () => {
    const view = render(
      <StudyTimerProvider>
        <TimerProbe />
      </StudyTimerProvider>,
    );

    act(() => {
      timer.setPending({ subjectId: "materia-1", minutes: 42, fecha: "2026-11-26" });
    });

    view.rerender(
      <StudyTimerProvider>
        <span>Otra sección</span>
      </StudyTimerProvider>,
    );
    view.rerender(
      <StudyTimerProvider>
        <TimerProbe />
      </StudyTimerProvider>,
    );

    expect(timer.pending).toEqual({ subjectId: "materia-1", minutes: 42, fecha: "2026-11-26" });
  });
});
