import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StudyData } from "./study";
export const studyOptions = queryOptions({
  queryKey: ["study-data"],
  queryFn: async (): Promise<StudyData> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Iniciá sesión para continuar");
    const [profile, subjects, exams] = await Promise.all([
      supabase.from("profiles").select("nombre").eq("id", auth.user.id).single(),
      supabase.from("subjects").select("*").order("created_at"),
      supabase.from("exams").select("*").order("fecha"),
    ]);
    for (const result of [profile, subjects, exams]) if (result.error) throw result.error;
    const sessions = [];
    for (let start = 0; ; start += 1000) {
      const result = await supabase
        .from("study_sessions")
        .select("*")
        .order("fecha", { ascending: false })
        .order("id")
        .range(start, start + 999);
      if (result.error) throw result.error;
      sessions.push(...result.data);
      if (result.data.length < 1000) break;
    }
    return {
      userId: auth.user.id,
      nombre: profile.data?.nombre ?? "Estudiante",
      subjects: subjects.data ?? [],
      sessions,
      exams: exams.data ?? [],
    };
  },
});
