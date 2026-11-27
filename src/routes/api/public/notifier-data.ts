import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/notifier-data")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});

async function handle({ request }: { request: Request }) {
  const expected = process.env["NOTIFIER_TOKEN"];
  if (!expected || request.headers.get("x-notifier-token") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  const day = 86400000;
  const since = new Date(Date.now() - 60 * day).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - day).toISOString().slice(0, 10);

  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return new Response(authErr.message, { status: 500 });

  const [subjects, sessions, exams] = await Promise.all([
    admin.from("subjects").select("id,user_id,nombre,meta_semanal_horas").eq("archivada", false),
    admin.from("study_sessions").select("user_id,subject_id,fecha,duracion_minutos").gte("fecha", since),
    admin.from("exams").select("user_id,titulo,fecha,subjects(nombre)").gte("fecha", yesterday),
  ]);
  for (const r of [subjects, sessions, exams]) {
    if (r.error) return new Response(r.error.message, { status: 500 });
  }

  const users = authData.users
    .filter((u) => u.email)
    .map((u) => ({
      id: u.id,
      email: u.email,
      nombre: u.user_metadata?.["nombre"] ?? u.user_metadata?.["name"] ?? null,
      subjects: (subjects.data ?? []).filter((s) => s.user_id === u.id),
      sessions: (sessions.data ?? []).filter((s) => s.user_id === u.id),
      exams: (exams.data ?? [])
        .filter((e) => e.user_id === u.id)
        .map((e) => ({ titulo: e.titulo, fecha: e.fecha, materia: e.subjects?.nombre ?? "" })),
    }));

  return Response.json({ users });
}
