import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  notas: z.string().trim().min(3).max(2000),
  subjectId: z.string().uuid().nullable(),
});

const INSTRUCTIONS = `Sos un tutor de estudio para estudiantes universitarios. Respondé en español rioplatense, breve y concreto.
Con las notas del estudiante y su historial, generá recomendaciones para su PRÓXIMA sesión de estudio:
1. Un objetivo claro para la sesión.
2. 3 a 5 pasos concretos (con tiempos aproximados).
3. Un consejo de técnica de estudio adecuado a lo que contó.
Usá Markdown simple (títulos cortos y listas). No inventes datos que no estén en las notas.`;

export const recommendNextSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("study_sessions")
      .select("fecha, duracion_minutos, nota, subjects(nombre)")
      .order("fecha", { ascending: false })
      .limit(10);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    const [{ data: sessions }, { data: exams }] = await Promise.all([
      q,
      supabase.from("exams").select("titulo, fecha, subjects(nombre)").gte("fecha", new Date().toISOString().slice(0, 10)).order("fecha").limit(5),
    ]);
    const historial = (sessions ?? [])
      .map((s: any) => `- ${s.fecha} · ${s.subjects?.nombre ?? "?"} · ${s.duracion_minutos} min${s.nota ? ` · nota: ${s.nota}` : ""}`)
      .join("\n") || "Sin sesiones previas.";
    const examenes = (exams ?? []).map((e: any) => `- ${e.fecha}: ${e.titulo} (${e.subjects?.nombre ?? "?"})`).join("\n") || "Ninguno.";
    const prompt = `Notas del estudiante:\n${data.notas}\n\nÚltimas sesiones:\n${historial}\n\nPróximos exámenes:\n${examenes}`;
    try {
      const { generateRecommendation } = await import("./ai-coach.server");
      return { text: await generateRecommendation(prompt, INSTRUCTIONS), error: null as string | null };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      console.error("AI recommendation failed", status, e?.message);
      const msg =
        status === 429 ? "Hay muchas consultas ahora. Probá de nuevo en un rato."
        : status === 402 ? "Se agotaron los créditos de IA del espacio de trabajo."
        : "No se pudo generar la recomendación. Intentá más tarde.";
      return { text: "", error: msg };
    }
  });
