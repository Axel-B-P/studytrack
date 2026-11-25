import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, ListChecks, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { planSchema, taskSchema, planProgress } from "@/lib/plans";
import type { StudyData } from "@/lib/study";

type Plan = { id: string; titulo: string; objetivo: string | null; subject_id: string | null; fecha_inicio: string; fecha_fin: string };
type Task = { id: string; plan_id: string; titulo: string; fecha: string; minutos: number; completada: boolean };
const fmt = (d: string) => format(new Date(d + "T12:00:00"), "d MMM", { locale: es });

export function StudyPlans({ data }: { data: StudyData }) {
  const qc = useQueryClient();
  const { data: plans, isLoading } = useQuery({
    queryKey: ["study-plans"],
    queryFn: async () => {
      const [p, t] = await Promise.all([
        supabase.from("study_plans").select("*").order("fecha_inicio"),
        supabase.from("plan_tasks").select("*").order("fecha"),
      ]);
      if (p.error) throw p.error;
      if (t.error) throw t.error;
      return { plans: p.data as Plan[], tasks: t.data as Task[] };
    },
  });
  const [planModal, setPlanModal] = useState<{ value?: Plan } | null>(null);
  const [taskPlan, setTaskPlan] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["study-plans"] });

  async function savePlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = planSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos"); return; }
    const row = { ...parsed.data, subject_id: parsed.data.subject_id || null, objetivo: parsed.data.objetivo || null };
    const res = planModal?.value
      ? await supabase.from("study_plans").update(row).eq("id", planModal.value.id)
      : await supabase.from("study_plans").insert(row);
    if (res.error) { toast.error("No pudimos guardar el plan"); return; }
    toast.success("Plan guardado");
    setPlanModal(null);
    refresh();
  }
  async function saveTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = taskSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success || !taskPlan) { toast.error("Revisá la tarea (mínimo 5 minutos)"); return; }
    const res = await supabase.from("plan_tasks").insert({ ...parsed.data, plan_id: taskPlan });
    if (res.error) { toast.error("No pudimos agregar la tarea"); return; }
    setTaskPlan(null);
    refresh();
  }
  async function toggle(t: Task) {
    const res = await supabase.from("plan_tasks").update({ completada: !t.completada }).eq("id", t.id);
    if (res.error) toast.error("No pudimos actualizar la tarea");
    refresh();
  }
  async function del(table: "study_plans" | "plan_tasks", id: string) {
    if (!confirm(table === "study_plans" ? "¿Eliminar este plan y sus tareas?" : "¿Eliminar esta tarea?")) return;
    const res = await supabase.from(table).delete().eq("id", id);
    if (res.error) toast.error("No pudimos eliminarlo");
    refresh();
  }

  const editing = planModal?.value;
  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setPlanModal({})}>
          <Plus /> Nuevo plan
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando planes…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {plans?.plans.map((p) => {
          const tasks = plans.tasks.filter((t) => t.plan_id === p.id);
          const pct = planProgress(tasks);
          const subject = data.subjects.find((s) => s.id === p.subject_id);
          return (
            <article key={p.id} className="panel p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {subject && <p className="text-xs text-primary">{subject.nombre}</p>}
                  <h2 className="text-lg font-semibold">{p.titulo}</h2>
                  <p className="text-xs text-muted-foreground">
                    {fmt(p.fecha_inicio)} – {fmt(p.fecha_fin)}
                  </p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label="Editar plan" onClick={() => setPlanModal({ value: p })}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Eliminar plan" onClick={() => del("study_plans", p.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {p.objetivo && <p className="mt-3 text-sm text-muted-foreground">{p.objetivo}</p>}
              <div className="mt-4 flex items-center gap-3 text-xs">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                {pct}%
              </div>
              <ul className="mt-4 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                    <button
                      aria-label={t.completada ? "Marcar pendiente" : "Marcar completada"}
                      onClick={() => toggle(t)}
                      className={"grid size-5 place-items-center rounded border border-primary " + (t.completada ? "bg-primary text-primary-foreground" : "")}
                    >
                      {t.completada && <Check size={14} />}
                    </button>
                    <span className={"flex-1 " + (t.completada ? "text-muted-foreground line-through" : "")}>{t.titulo}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(t.fecha)} · {t.minutos} min
                    </span>
                    <Button variant="ghost" size="icon" aria-label="Eliminar tarea" onClick={() => del("plan_tasks", t.id)}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setTaskPlan(p.id)}>
                <ListChecks /> Agregar tarea
              </Button>
            </article>
          );
        })}
        {plans && !plans.plans.length && (
          <p className="panel p-8 text-center text-sm text-muted-foreground">Todavía no creaste planes de estudio</p>
        )}
      </div>
      <Dialog open={planModal !== null} onOpenChange={(v) => !v && setPlanModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan de estudio"}</DialogTitle>
            <DialogDescription>Definí un objetivo y un período para organizarte.</DialogDescription>
          </DialogHeader>
          <form onSubmit={savePlan} className="space-y-4">
            <label className="field">Título<input name="titulo" required maxLength={120} defaultValue={editing?.titulo} /></label>
            <label className="field">
              Materia (opcional)
              <select name="subject_id" defaultValue={editing?.subject_id ?? ""}>
                <option value="">Sin materia</option>
                {data.subjects.filter((s) => !s.archivada).map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field">Inicio<input type="date" name="fecha_inicio" required defaultValue={editing?.fecha_inicio} /></label>
              <label className="field">Fin<input type="date" name="fecha_fin" required defaultValue={editing?.fecha_fin} /></label>
            </div>
            <label className="field">Objetivo<textarea name="objetivo" maxLength={500} rows={3} defaultValue={editing?.objetivo ?? ""} /></label>
            <Button className="w-full">Guardar plan</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={taskPlan !== null} onOpenChange={(v) => !v && setTaskPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
            <DialogDescription>Un bloque de estudio dentro del plan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTask} className="space-y-4">
            <label className="field">Qué vas a estudiar<input name="titulo" required maxLength={160} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field">Fecha<input type="date" name="fecha" required /></label>
              <label className="field">Minutos<input type="number" name="minutos" min={5} max={1440} defaultValue={60} required /></label>
            </div>
            <Button className="w-full">Agregar tarea</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
