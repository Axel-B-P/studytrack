import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  LayoutDashboard,
  Timer,
  CalendarDays,
  UserRound,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Clock3,
  Flame,
  Target,
  Sun,
  Moon,
  LogOut,
  Play,
  Pause,
  Square,
  Trash2,
  Pencil,
  Archive,
  Check,
  GraduationCap,
  ArrowRight,
  ListChecks,
} from "lucide-react";
import { StudyPlans } from "./plans";
import { useStudyTimer } from "./timer-state";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { studyOptions } from "@/lib/study-data";
import {
  demoData,
  dateKey,
  weekSessions,
  streak,
  progress,
  daysLeft,
  subjectSchema,
  sessionSchema,
  examSchema,
  type StudyData,
  type Subject,
  type Session,
  type Exam,
} from "@/lib/study";
type Page = "dashboard" | "materias" | "sesiones" | "examenes" | "planes" | "perfil";
type Modal =
  | { kind: "subject"; value?: Subject }
  | { kind: "session"; value?: Session }
  | { kind: "exam"; value?: Exam }
  | null;
const nav = [
  { page: "dashboard", path: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { page: "materias", path: "/materias", label: "Materias", icon: BookOpen },
  { page: "sesiones", path: "/sesiones", label: "Sesiones de estudio", icon: Timer },
  { page: "examenes", path: "/examenes", label: "Exámenes", icon: CalendarDays },
  { page: "planes", path: "/planes", label: "Planes", icon: ListChecks },
  { page: "perfil", path: "/perfil", label: "Mi perfil", icon: UserRound },
] as const;
const hours = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
export function PersonalApp({ page }: { page: Page }) {
  const { data } = useSuspenseQuery(studyOptions);
  return <StudyApp data={data} page={page} />;
}
export function DemoApp() {
  const [data] = useState(() => demoData());
  const navigate = useNavigate();
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const result = await supabase.auth.getUser();
      return result.data.user;
    },
  });
  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);
  return <StudyApp data={data} page="dashboard" demo />;
}
function StudyApp({ data, page, demo = false }: { data: StudyData; page: Page; demo?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Modal>(null);
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  useEffect(() => {
    setDark(localStorage.getItem("study-theme") === "dark");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const now = new Date();
  const weekDate = subDays(now, weekOffset * 7);
  const weekly = weekSessions(data.sessions, weekDate);
  const active = data.subjects.filter((s) => !s.archivada);
  const subjectHours = (id: string) =>
    weekly.filter((s) => s.subject_id === id).reduce((a, s) => a + s.duracion_minutos / 60, 0);
  const total = weekly.reduce((a, s) => a + s.duracion_minutos / 60, 0);
  const goal = active.reduce((a, s) => a + s.meta_semanal_horas, 0);
  const completed = active.reduce((a, s) => a + subjectHours(s.id), 0);
  const upcoming = data.exams.filter((e) => daysLeft(e.fecha) >= 0).slice(0, 3);
  function open(value: Modal) {
    if (demo) {
      toast("Creá tu cuenta para registrar tu progreso");
      navigate({ to: "/auth" });
      return;
    }
    setModal(value);
  }
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  async function remove(kind: "subjects" | "study_sessions" | "exams", id: string) {
    if (
      !window.confirm(
        kind === "subjects"
          ? "¿Eliminar esta materia y todas sus sesiones y exámenes?"
          : "¿Eliminar este registro?",
      )
    )
      return;
    const { error } = await supabase.from(kind).delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else {
      toast.success("Registro eliminado");
      queryClient.invalidateQueries({ queryKey: studyOptions.queryKey });
    }
  }
  async function archive(s: Subject) {
    const { error } = await supabase
      .from("subjects")
      .update({ archivada: !s.archivada })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: studyOptions.queryKey });
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    setBusy(true);
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      let result;
      if (modal.kind === "subject") {
        const payload = subjectSchema.parse(fields);
        result = modal.value
          ? await supabase.from("subjects").update(payload).eq("id", modal.value.id)
          : await supabase.from("subjects").insert({ ...payload, user_id: data.userId });
      } else if (modal.kind === "session") {
        const payload = sessionSchema.parse(fields);
        result = modal.value
          ? await supabase.from("study_sessions").update(payload).eq("id", modal.value.id)
          : await supabase.from("study_sessions").insert({ ...payload, user_id: data.userId });
      } else {
        const payload = examSchema.parse(fields);
        result = modal.value
          ? await supabase.from("exams").update(payload).eq("id", modal.value.id)
          : await supabase.from("exams").insert({ ...payload, user_id: data.userId });
      }
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: studyOptions.queryKey });
      setModal(null);
      toast.success("Cambios guardados");
    } catch {
      toast.error("Revisá los datos. No se pudieron guardar los cambios.");
    } finally {
      setBusy(false);
    }
  }
  const navigation = (mobile = false) =>
    nav.map((item) => (
      <Button
        key={item.page}
        variant="ghost"
        className={"nav-item " + (page === item.page ? "active" : "")}
        asChild
      >
        <Link to={demo ? "/auth" : item.path}>
          <item.icon size={18} />
          <span>{mobile && item.page === "sesiones" ? "Sesiones" : item.label}</span>
        </Link>
      </Button>
    ));
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <BookOpen size={21} />
          </span>
          StudyTrack<span className="text-primary">.</span>
        </Link>
        <div className="mt-12 mb-3 px-3 text-[10px] font-semibold uppercase text-muted-foreground">
          Tu espacio de estudio
        </div>
        <nav>{navigation()}</nav>
        <div className="mt-auto">
          <div className="rounded-lg bg-focus p-4 text-focus-foreground">
            <GraduationCap size={23} />
            <p className="mt-3 text-sm font-semibold">Un día a la vez.</p>
            <p className="mt-1 text-xs leading-5">Cada sesión te acerca a tus metas. Seguí así.</p>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
            <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-primary">
              {data.nombre.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{data.nombre}</p>
              <p className="text-xs text-muted-foreground">Estudiante</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={demo ? "Iniciar sesión" : "Cerrar sesión"}
              title={demo ? "Iniciar sesión" : "Cerrar sesión"}
              onClick={() => (demo ? navigate({ to: "/auth" }) : signOut())}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Mi espacio</span>
            <ChevronRight size={14} className="hidden sm:inline" />
            <span className="font-medium text-foreground">
              {nav.find((n) => n.page === page)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {format(now, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            {demo && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">
                  Ingresar <ArrowRight />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title={dark ? "Modo claro" : "Modo oscuro"}
              aria-label={dark ? "Modo claro" : "Modo oscuro"}
              onClick={() => {
                localStorage.setItem("study-theme", dark ? "light" : "dark");
                setDark(!dark);
              }}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">
              {data.nombre.slice(0, 1)}
            </span>
          </div>
        </header>
        <main className="page-content">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                {page === "dashboard" ? "TU PROGRESO, EN UN SOLO LUGAR" : "TU ESPACIO DE ESTUDIO"}
                {demo && (
                  <span className="rounded border border-border px-2 py-0.5 normal-case">
                    Datos de ejemplo
                  </span>
                )}
              </div>
              <h1 className="page-title">
                {page === "dashboard"
                  ? `¡Hola, ${data.nombre.split(" ")[0]}!`
                  : page === "materias"
                    ? "Mis materias"
                    : page === "sesiones"
                      ? "Sesiones de estudio"
                      : page === "examenes"
                        ? "Mis exámenes"
                        : page === "planes"
                          ? "Planes de estudio"
                          : "Mi perfil"}
                {page === "dashboard" && <span className="ml-2 text-warm">☀</span>}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {page === "dashboard"
                  ? "Cada pequeño esfuerzo cuenta. Mirá cuánto avanzaste."
                  : page === "materias"
                    ? "Organizá tus materias y poné tus metas en marcha."
                    : page === "sesiones"
                      ? "Tiempo de concentrarte en lo que importa."
                      : page === "examenes"
                        ? "Tus próximas fechas, sin perderlas de vista."
                        : page === "planes"
                          ? "Armá un plan, dividilo en tareas y seguí tu avance."
                          : "Tu espacio, a tu manera."}
              </p>
            </div>
            {page !== "perfil" && page !== "planes" && (
              <Button
                onClick={() =>
                  open({
                    kind:
                      page === "materias" ? "subject" : page === "examenes" ? "exam" : "session",
                  })
                }
              >
                <Plus />
                {page === "materias"
                  ? "Nueva materia"
                  : page === "examenes"
                    ? "Nuevo examen"
                    : "Registrar sesión"}
              </Button>
            )}
          </div>
          {page === "dashboard" && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays size={16} className="text-muted-foreground" />
                  {format(startOfWeek(weekDate, { weekStartsOn: 1 }), "d MMM", {
                    locale: es,
                  })} –{" "}
                  {format(endOfWeek(weekDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
                  <span className="ml-1 rounded bg-accent px-2 py-1 text-[10px] text-primary">
                    {weekOffset === 0 ? "Esta semana" : "Semana anterior"}
                  </span>
                </div>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Semana anterior"
                    onClick={() => setWeekOffset((n) => n + 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={weekOffset === 0}
                    aria-label="Semana siguiente"
                    onClick={() => setWeekOffset((n) => n - 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  {
                    label: "Horas esta semana",
                    value: hours(total) + " h",
                    detail: `de ${goal} h de meta semanal`,
                    icon: Clock3,
                    tone: "text-primary",
                  },
                  {
                    label: "Horas de estudio hoy",
                    value:
                      hours(
                        data.sessions
                          .filter((s) => s.fecha === dateKey(now))
                          .reduce((a, s) => a + s.duracion_minutos / 60, 0),
                      ) + " h",
                    detail: "Un paso más hacia tus objetivos",
                    icon: Timer,
                    tone: "text-cool",
                  },
                  {
                    label: "Racha actual",
                    value: streak(data.sessions) + " días",
                    detail: "La constancia hace la diferencia",
                    icon: Flame,
                    tone: "text-warm",
                  },
                  {
                    label: "Metas cumplidas",
                    value: Math.round(progress(completed, goal)) + " %",
                    detail: `${active.filter((s) => subjectHours(s.id) >= s.meta_semanal_horas).length} de ${active.length} materias en su meta`,
                    icon: Target,
                    tone: "text-lilac",
                  },
                ].map((item) => (
                  <article className="panel p-5" key={item.label}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <span className={"stat-icon " + item.tone}>
                        <item.icon size={18} />
                      </span>
                    </div>
                    <p className="stat-number">{item.value}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <section className="panel p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="chart-title">Estudio por materia</h2>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-sm bg-primary" />
                        Estudiado
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-sm bg-muted" />
                        Meta semanal
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tu dedicación de esta semana frente a tus metas
                  </p>
                  <div className="mt-7 h-[230px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={active.map((s) => ({
                          nombre: s.nombre.split(" ").slice(0, 2).join(" "),
                          horas: Number(subjectHours(s.id).toFixed(1)),
                          meta: s.meta_semanal_horas,
                          color: s.color,
                        }))}
                        barGap={5}
                        margin={{ left: -23, right: 4, bottom: 3 }}
                      >
                        <CartesianGrid
                          stroke="var(--border)"
                          vertical={false}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="nombre"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v + " h"} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            borderColor: "var(--border)",
                            borderRadius: 8,
                            color: "var(--foreground)",
                          }}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="horas"
                          name="Estudiado"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        >
                          {active.map((s) => (
                            <Cell key={s.id} fill={s.color} />
                          ))}
                        </Bar>
                        <Bar
                          isAnimationActive={false}
                          dataKey="meta"
                          name="Meta semanal"
                          fill="var(--muted)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel p-6">
                  <h2 className="chart-title">Distribución del tiempo</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    En qué invertiste tus horas esta semana
                  </p>
                  <div className="relative mt-2 h-[176px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={active.map((s) => ({ name: s.nombre, value: subjectHours(s.id) }))}
                          innerRadius={56}
                          outerRadius={74}
                          dataKey="value"
                          paddingAngle={4}
                          stroke="none"
                        >
                          {active.map((s) => (
                            <Cell key={s.id} fill={s.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid content-center text-center">
                      <b className="text-2xl">{hours(completed)} h</b>
                      <span className="text-[10px] text-muted-foreground">en total</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {active.map((s) => (
                      <div className="flex items-center justify-between text-xs" key={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="subject-dot" style={{ background: s.color }} />
                          {s.nombre}
                        </span>
                        <span className="font-medium">
                          {Math.round(progress(subjectHours(s.id), completed))}%
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <section className="panel p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="chart-title">Tu ritmo de estudio</h2>
                    <span className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">
                      Últimas 4 semanas
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La suma de tus esfuerzos, día a día
                  </p>
                  <div className="mt-6 h-[185px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={Array.from({ length: 28 }, (_, i) => {
                          const date = subDays(now, 27 - i);
                          return {
                            fecha: format(date, "d MMM", { locale: es }),
                            horas: Number(
                              data.sessions
                                .filter((s) => s.fecha === dateKey(date))
                                .reduce((a, s) => a + s.duracion_minutos / 60, 0)
                                .toFixed(1),
                            ),
                          };
                        })}
                        margin={{ left: -22, right: 10 }}
                      >
                        <CartesianGrid
                          stroke="var(--border)"
                          vertical={false}
                          strokeDasharray="3 3"
                        />
                        <XAxis dataKey="fecha" axisLine={false} tickLine={false} minTickGap={35} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v + " h"} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                          }}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="horas"
                          name="Horas"
                          stroke="var(--primary)"
                          fill="var(--accent)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="chart-title">Próximos exámenes</h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Ver exámenes"
                      aria-label="Ver exámenes"
                      asChild
                    >
                      <Link to={demo ? "/auth" : "/examenes"}>
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-3 divide-y divide-border">
                    {upcoming.length === 0 ? (
                      <Empty text="No tenés exámenes próximos" />
                    ) : (
                      upcoming.map((e) => {
                        const subject = data.subjects.find((s) => s.id === e.subject_id);
                        return (
                          <div key={e.id} className="flex items-center gap-3 py-4">
                            <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-md bg-muted">
                              <span className="text-[9px] uppercase text-muted-foreground">
                                {format(new Date(e.fecha + "T12:00:00"), "MMM", { locale: es })}
                              </span>
                              <b className="text-lg leading-5">
                                {format(new Date(e.fecha + "T12:00:00"), "dd")}
                              </b>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">{subject?.nombre}</p>
                              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                {e.titulo}
                              </p>
                            </div>
                            <span className="rounded bg-accent px-2 py-1 text-[10px] text-primary">
                              {daysLeft(e.fecha) === 0 ? "Hoy" : `En ${daysLeft(e.fecha)} días`}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
              <section className="mt-6 flex items-center justify-between gap-4 rounded-lg bg-focus px-6 py-5 text-focus-foreground">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card/60">
                    <Play size={21} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">¿Listo para tu próxima sesión?</h2>
                    <p className="mt-1 text-xs opacity-80">
                      Un poco de foco hoy, un gran avance mañana.
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to={demo ? "/auth" : "/sesiones"}>
                    <span className="hidden sm:inline">Empezar a estudiar</span>
                    <ArrowRight />
                  </Link>
                </Button>
              </section>
              <p className="mt-6 text-center text-[10px] text-muted-foreground">
                Hecho para tu progreso. A tu ritmo.
              </p>
            </>
          )}
          {page === "materias" && (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data.subjects.map((s) => (
                  <article key={s.id} className="panel p-6">
                    <div className="flex justify-between">
                      <span
                        className="grid size-10 place-items-center rounded-lg bg-muted"
                        style={{ color: s.color }}
                      >
                        <BookOpen size={20} />
                      </span>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={"Editar " + s.nombre}
                          onClick={() => open({ kind: "subject", value: s })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={s.archivada ? "Restaurar materia" : "Archivar materia"}
                          onClick={() => archive(s)}
                        >
                          <Archive />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={"Eliminar " + s.nombre}
                          onClick={() => remove("subjects", s.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <h2 className="mt-5 font-semibold">{s.nombre}</h2>
                    {s.archivada && (
                      <span className="text-xs text-muted-foreground">Archivada</span>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Meta semanal: {s.meta_semanal_horas} horas
                    </p>
                    <div className="mt-6 flex justify-between text-xs">
                      <span>{hours(subjectHours(s.id))} h estudiadas</span>
                      <b>{Math.round(progress(subjectHours(s.id), s.meta_semanal_horas))}%</b>
                    </div>
                    <div className="progress-track mt-3">
                      <div
                        className="progress-fill"
                        style={{
                          width:
                            Math.min(100, progress(subjectHours(s.id), s.meta_semanal_horas)) + "%",
                          background: s.color,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
              {!data.subjects.length && <Empty text="Todavía no agregaste materias" />}
            </>
          )}
          {page === "sesiones" && (
            <>
              <StudyTimer data={data} />
              <SessionHistory
                data={data}
                edit={(s) => open({ kind: "session", value: s })}
                remove={(id) => remove("study_sessions", id)}
              />
            </>
          )}
          {page === "examenes" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.exams.map((e) => (
                <article className="panel p-6" key={e.id}>
                  <div className="flex justify-between">
                    <CalendarDays className="text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {daysLeft(e.fecha) < 0
                        ? "Finalizado"
                        : daysLeft(e.fecha) === 0
                          ? "Hoy"
                          : `Faltan ${daysLeft(e.fecha)} días`}
                    </span>
                  </div>
                  <p className="mt-5 text-xs text-primary">
                    {data.subjects.find((s) => s.id === e.subject_id)?.nombre}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{e.titulo}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {format(new Date(e.fecha + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar examen"
                      onClick={() => open({ kind: "exam", value: e })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar examen"
                      onClick={() => remove("exams", e.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
              {!data.exams.length && <Empty text="Todavía no agregaste exámenes" />}
            </div>
          )}
          {page === "planes" && <StudyPlans data={data} />}
          {page === "perfil" && <Profile data={data} signOut={signOut} />}
        </main>
      </div>
      <nav className="mobile-nav">{navigation(true)}</nav>
      <Dialog
        open={modal !== null}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal?.value ? "Editar" : "Nueva"}{" "}
              {modal?.kind === "subject"
                ? "materia"
                : modal?.kind === "session"
                  ? "sesión de estudio"
                  : "fecha de examen"}
            </DialogTitle>
            <DialogDescription>Organizá tu progreso de estudio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {modal?.kind === "subject" ? (
              <>
                <label className="field">
                  Nombre
                  <input
                    name="nombre"
                    defaultValue={modal.value?.nombre}
                    maxLength={100}
                    required
                    autoFocus
                  />
                </label>
                <label className="field">
                  Meta semanal (horas)
                  <input
                    name="meta_semanal_horas"
                    type="number"
                    min="0.5"
                    max="168"
                    step="0.5"
                    defaultValue={modal.value?.meta_semanal_horas ?? 5}
                    required
                  />
                </label>
                <label className="field">
                  Color
                  <input
                    name="color"
                    type="color"
                    defaultValue={modal.value?.color ?? "#35ad96"}
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  Materia
                  <select
                    aria-label="Materia"
                    name="subject_id"
                    defaultValue={modal?.value?.subject_id}
                    required
                  >
                    <option value="">Elegí una materia</option>
                    {data.subjects
                      .filter((s) => !s.archivada || s.id === modal?.value?.subject_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                  </select>
                </label>
                {modal?.kind === "exam" && (
                  <label className="field">
                    Título
                    <input
                      name="titulo"
                      defaultValue={modal.value?.titulo}
                      maxLength={150}
                      required
                    />
                  </label>
                )}
                <label className="field">
                  Fecha
                  <input
                    type="date"
                    name="fecha"
                    defaultValue={modal?.value?.fecha ?? dateKey(now)}
                    required
                  />
                </label>
                {modal?.kind === "session" && (
                  <>
                    <label className="field">
                      Duración (minutos)
                      <input
                        name="duracion_minutos"
                        type="number"
                        min="1"
                        max="1440"
                        defaultValue={modal.value?.duracion_minutos ?? 60}
                        required
                      />
                    </label>
                    <label className="field">
                      Nota (opcional)
                      <textarea
                        name="nota"
                        defaultValue={modal.value?.nota ?? ""}
                        maxLength={1000}
                      />
                    </label>
                  </>
                )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <BookOpen className="mx-auto mb-4 opacity-50" />
      {text}
    </div>
  );
}
function StudyTimer({ data }: { data: StudyData }) {
  const queryClient = useQueryClient();
  const { subject, setSubject, seconds, setSeconds, running, setRunning, setStart } =
    useStudyTimer();
  const [saving, setSaving] = useState(false);
  async function finish() {
    setRunning(false);
    setSaving(true);
    const payload = sessionSchema.safeParse({
      subject_id: subject,
      fecha: dateKey(new Date()),
      duracion_minutos: Math.max(1, Math.ceil(seconds / 60)),
      nota: "",
    });
    if (!payload.success) {
      toast.error("La sesión debe durar menos de 24 horas");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("study_sessions")
      .insert({ ...payload.data, user_id: data.userId });
    if (error) toast.error("No se pudo guardar. Volvé a intentar.");
    else {
      await queryClient.invalidateQueries({ queryKey: studyOptions.queryKey });
      setSeconds(0);
      toast.success("¡Sesión guardada! Un paso más.");
    }
    setSaving(false);
  }
  return (
    <section className="panel mb-8 p-8 text-center">
      <span className="text-xs font-semibold text-primary">MOMENTO DE ENFOCARTE</span>
      <div className="mx-auto mt-5 max-w-xs">
        <label className="field text-left">
          Materia
          <select
            aria-label="Materia del cronómetro"
            value={subject}
            disabled={running || seconds > 0}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Elegí una materia</option>
            {data.subjects
              .filter((s) => !s.archivada)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
          </select>
        </label>
      </div>
      <p className="timer-digits my-7">
        {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
        {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="flex justify-center gap-3">
        <Button
          disabled={!subject || saving}
          onClick={() => {
            if (running) {
              setRunning(false);
            } else {
              setStart(Date.now() - seconds * 1000);
              setRunning(true);
            }
          }}
        >
          {running ? <Pause /> : <Play />}
          {running ? "Pausar" : seconds ? "Continuar" : "Iniciar"}
        </Button>
        <Button variant="outline" disabled={!seconds || saving} onClick={finish}>
          <Square />
          {saving ? "Guardando…" : "Finalizar"}
        </Button>
      </div>
      {(seconds > 0 || running) && (
        <p className="mt-4 text-xs text-muted-foreground">
          Podés cambiar de sección: el tiempo va a seguir corriendo.
        </p>
      )}
    </section>
  );
}
function SessionHistory({
  data,
  edit,
  remove,
}: {
  data: StudyData;
  edit: (s: Session) => void;
  remove: (id: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = data.sessions.filter(
    (s) =>
      (!subject || s.subject_id === subject) &&
      (!from || s.fecha >= from) &&
      (!to || s.fecha <= to),
  );
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Historial de sesiones</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="field">
          Materia
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Todas las materias</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          Hasta
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              {["Materia", "Fecha", "Duración", "Nota", ""].map((v, i) => (
                <th key={i} className="px-5 py-4 font-medium">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr className="border-t border-border" key={s.id}>
                <td className="px-5 py-4 font-medium">
                  {data.subjects.find((v) => v.id === s.subject_id)?.nombre}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {format(new Date(s.fecha + "T12:00:00"), "dd/MM/yyyy")}
                </td>
                <td className="whitespace-nowrap px-5 py-4">{s.duracion_minutos} min</td>
                <td className="max-w-xs truncate px-5 py-4 text-muted-foreground">
                  {s.nota || "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar sesión"
                      onClick={() => edit(s)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar sesión"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty text="Todavía no registraste sesiones" />}
      </div>
    </section>
  );
}
function Profile({ data, signOut }: { data: StudyData; signOut: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(data.nombre);
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-lg">
      <form
        className="panel space-y-6 p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          const valid = subjectSchema.shape.nombre.safeParse(name);
          if (!valid.success) {
            toast.error("Ingresá un nombre válido");
            return;
          }
          setBusy(true);
          const { error } = await supabase
            .from("profiles")
            .update({ nombre: valid.data })
            .eq("id", data.userId);
          if (error) toast.error("No se pudo guardar");
          else {
            await queryClient.invalidateQueries({ queryKey: studyOptions.queryKey });
            toast.success("Nombre actualizado");
          }
          setBusy(false);
        }}
      >
        <span className="grid size-16 place-items-center rounded-full bg-accent text-2xl font-medium text-primary">
          {data.nombre.slice(0, 1)}
        </span>
        <label className="field">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        <Button disabled={busy}>
          <Check />
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
      <Button className="mt-6" variant="outline" onClick={signOut}>
        <LogOut />
        Cerrar sesión
      </Button>
    </div>
  );
}
