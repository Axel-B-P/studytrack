import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recommendNextSession } from "@/lib/ai-coach.functions";
import type { StudyData } from "@/lib/study";

export function AiCoach({ data }: { data: StudyData }) {
  const recommend = useServerFn(recommendNextSession);
  const [notas, setNotas] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function run() {
    if (notas.trim().length < 3) {
      toast.error("Escribí un poco sobre cómo te fue");
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const r = await recommend({ data: { notas, subjectId: subjectId || null } });
      if (r.error) toast.error(r.error);
      else setResult(r.text);
    } catch {
      toast.error("No se pudo generar la recomendación. Intentá más tarde.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mb-8 p-6">
      <div className="flex items-center justify-between">
        <h2 className="chart-title flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Recomendaciones con IA
        </h2>
        <span className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">
          Para tu próxima sesión
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Contá cómo te fue y qué te costó; usamos tus notas y tus últimas sesiones para sugerirte cómo seguir.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="field">
          Materia (opcional)
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Todas</option>
            {data.subjects
              .filter((s) => !s.archivada)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Tus notas de sesión
          <textarea
            value={notas}
            maxLength={2000}
            placeholder="Ej: repasé derivadas, entendí la regla de la cadena pero me trabo con los ejercicios de aplicación."
            onChange={(e) => setNotas(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={run} disabled={loading}>
          {loading ? "Pensando…" : "Generar recomendación"}
          {loading ? <Sparkles className="animate-pulse" /> : <ArrowRight />}
        </Button>
      </div>
      {result && (
        <div className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          {result.replace(/\*\*/g, "")}
        </div>
      )}
    </section>
  );
}
