import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recommendNextSession } from "@/lib/ai-coach.functions";
import type { StudyData } from "@/lib/study-data";

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
    <section className="panel space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Recomendaciones con IA</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Contá cómo te fue y qué te costó; la IA usa tus notas y tus últimas sesiones para sugerirte la próxima.
      </p>
      <label className="field">
        Materia (opcional)
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Todas</option>
          {data.subjects.filter((s) => !s.archivada).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
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
      <Button onClick={run} disabled={loading}>
        <Sparkles />
        {loading ? "Pensando…" : "Generar recomendación"}
      </Button>
      {result && (
        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
          {result.replace(/\*\*/g, "")}
        </div>
      )}
    </section>
  );
}
