import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/study";
export const Route = createFileRoute("/auth")({
  head: () => pageMeta("Ingresar"),
  component: Auth,
});
function Auth() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const schema = z.object({
      email: z.string().trim().email().max(255),
      password: z.string().min(8).max(128),
      nombre: z.string().trim().max(100),
    });
    const parsed = schema.safeParse(values);
    if (!parsed.success || (register && !parsed.data.nombre)) {
      setMessage("Ingresá un email válido, tu nombre y una contraseña de al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const { email, password, nombre } = parsed.data;
    const result = register
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre }, emailRedirectTo: window.location.origin },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(
        register
          ? "No pudimos crear la cuenta. Revisá tus datos o intentá más tarde."
          : "Email o contraseña incorrectos, o email sin confirmar.",
      );
      return;
    }
    if (!result.data.session) {
      setMessage("Revisá tu email para confirmar tu cuenta antes de ingresar.");
      return;
    }
    await navigate({ to: "/dashboard" });
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-12">
      <Link to="/" className="brand mb-10">
        <span className="brand-mark">
          <BookOpen size={22} />
        </span>
        StudyTrack<span className="text-primary">.</span>
      </Link>
      <section className="panel w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">
          {register ? "Tu progreso empieza acá" : "Qué bueno verte de nuevo"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {register
            ? "Creá tu cuenta y organizá tu vida universitaria."
            : "Ingresá a tu espacio de estudio."}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className={register ? "field" : "hidden"}>
            Nombre
            <input
              name="nombre"
              required={register}
              maxLength={100}
              autoComplete="name"
              defaultValue=""
            />
          </label>
          <label className="field">
            Email
            <input
              type="email"
              name="email"
              required
              maxLength={255}
              autoComplete="email"
              placeholder="vos@universidad.edu"
            />
          </label>
          <label className="field">
            Contraseña
            <input
              type="password"
              name="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder="Al menos 8 caracteres"
            />
          </label>
          {!register && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={async (ev) => {
                const form = (ev.currentTarget as HTMLButtonElement).form;
                const email = String(new FormData(form!).get("email") ?? "").trim();
                if (!z.string().email().safeParse(email).success) {
                  setMessage("Escribí tu email arriba y volvé a tocar “¿Olvidaste tu contraseña?”.");
                  return;
                }
                setBusy(true);
                await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                setBusy(false);
                setMessage("Si el email tiene una cuenta, te enviamos un enlace para crear una nueva contraseña.");
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {message && (
            <p role="status" className="rounded-md bg-accent p-3 text-sm">
              {message}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "Un momento…" : register ? "Crear cuenta" : "Ingresar"}
            <ArrowRight />
          </Button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          {register ? "¿Ya tenés cuenta?" : "¿Todavía no tenés cuenta?"}
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setRegister(!register);
              setMessage("");
            }}
          >
            {register ? "Ingresá" : "Registrate"}
          </Button>
        </div>
      </section>
      <Button variant="ghost" asChild className="mt-6">
        <Link to="/">
          <ArrowLeft />
          Ver el ejemplo
        </Link>
      </Button>
    </main>
  );
}
