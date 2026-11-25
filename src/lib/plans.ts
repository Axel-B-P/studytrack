import { z } from "zod";
export const planSchema = z
  .object({
    titulo: z.string().trim().min(1).max(120),
    objetivo: z.string().trim().max(500),
    subject_id: z.string(),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((v) => v.fecha_fin >= v.fecha_inicio, { message: "La fecha de fin no puede ser anterior al inicio" });
export const taskSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutos: z.coerce.number().int().min(5).max(1440),
});
/** Porcentaje de tareas completadas de un plan (0-100). */
export function planProgress(tasks: { completada: boolean }[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.completada).length / tasks.length) * 100);
}
