import { z } from "zod";
import {
  format,
  startOfWeek,
  endOfWeek,
  subDays,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
export type Subject = {
  id: string;
  nombre: string;
  color: string;
  meta_semanal_horas: number;
  archivada: boolean;
};
export type Session = {
  id: string;
  subject_id: string;
  fecha: string;
  duracion_minutos: number;
  nota: string | null;
};
export type Exam = { id: string; subject_id: string; titulo: string; fecha: string };
export type StudyData = {
  userId: string;
  nombre: string;
  subjects: Subject[];
  sessions: Session[];
  exams: Exam[];
};
export const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const subjectSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  meta_semanal_horas: z.coerce.number().positive().max(168),
});
export const sessionSchema = z.object({
  subject_id: z.string().uuid(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !Number.isNaN(new Date(v + "T12:00:00").getTime()), "Fecha inválida"),
  duracion_minutos: z.coerce.number().int().min(1).max(1440),
  nota: z.string().trim().max(1000),
});
export const examSchema = z.object({
  subject_id: z.string().uuid(),
  titulo: z.string().trim().min(1).max(150),
  fecha: sessionSchema.shape.fecha,
});
export function weekSessions(sessions: Session[], now = new Date()) {
  const start = dateKey(startOfWeek(now, { weekStartsOn: 1 }));
  const end = dateKey(endOfWeek(now, { weekStartsOn: 1 }));
  return sessions.filter((s) => s.fecha >= start && s.fecha <= end);
}
export function streak(sessions: Session[], now = new Date()) {
  const dates = new Set(sessions.map((s) => s.fecha));
  let cursor = now;
  if (!dates.has(dateKey(cursor))) cursor = subDays(cursor, 1);
  let count = 0;
  while (dates.has(dateKey(cursor))) {
    count++;
    cursor = subDays(cursor, 1);
  }
  return count;
}
export function progress(hours: number, goal: number) {
  return goal > 0 ? (hours / goal) * 100 : 0;
}
export const daysLeft = (date: string, now = new Date()) =>
  differenceInCalendarDays(new Date(date + "T12:00:00"), now);
export function demoData(now = new Date()): StudyData {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
  ];
  const subjects: Subject[] = [
    {
      id: ids[0] ?? "",
      nombre: "Análisis Matemático",
      color: "#35ad96",
      meta_semanal_horas: 8,
      archivada: false,
    },
    {
      id: ids[1] ?? "",
      nombre: "Programación II",
      color: "#759be0",
      meta_semanal_horas: 6,
      archivada: false,
    },
    {
      id: ids[2] ?? "",
      nombre: "Física I",
      color: "#e5b654",
      meta_semanal_horas: 5,
      archivada: false,
    },
    {
      id: ids[3] ?? "",
      nombre: "Álgebra y Geometría",
      color: "#b092cb",
      meta_semanal_horas: 4,
      archivada: false,
    },
  ];
  const sessions: Session[] = Array.from({ length: 28 }, (_, i) => ({
    id: "demo-" + i,
    subject_id: ids[i % 4] ?? "",
    fecha: dateKey(subDays(now, 27 - i)),
    duracion_minutos: [90, 120, 60, 75, 105, 150, 45][i % 7] ?? 60,
    nota: "Repaso de conceptos y ejercicios",
  }));
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  for (let i = 0; i < 4; i++)
    sessions.push({
      id: "week-" + i,
      subject_id: ids[i] ?? "",
      fecha: dateKey(monday),
      duracion_minutos: [330, 240, 165, 120][i] ?? 60,
      nota: "Práctica para el parcial",
    });
  return {
    userId: "demo",
    nombre: "Sofía",
    subjects,
    sessions,
    exams: [
      {
        id: "exam1",
        subject_id: ids[0] ?? "",
        titulo: "Segundo parcial",
        fecha: dateKey(addDays(now, 3)),
      },
      {
        id: "exam2",
        subject_id: ids[1] ?? "",
        titulo: "Entrega de trabajo práctico",
        fecha: dateKey(addDays(now, 7)),
      },
      {
        id: "exam3",
        subject_id: ids[2] ?? "",
        titulo: "Primer parcial",
        fecha: dateKey(addDays(now, 12)),
      },
    ],
  };
}
export const pageMeta = (title: string) => ({
  meta: [
    { title: title + " · StudyTrack" },
    {
      name: "description",
      content:
        "Organizá tus materias, registrá tus sesiones de estudio y seguí tus metas con StudyTrack.",
    },
    { property: "og:title", content: title + " · StudyTrack" },
    {
      property: "og:description",
      content: "Tu esfuerzo, tu progreso. Un espacio para organizar tu vida universitaria.",
    },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
