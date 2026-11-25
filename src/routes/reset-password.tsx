import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/study";
export const Route = createFileRoute("/reset-password")({
  head: () => pageMeta("Nueva contraseña"),
  component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8 || password.length > 128) { setMessage("Usá al menos 8 caracteres."); return; }
    if (password !== String(f.get("confirm"))) { setMessage("Las contraseñas no coinciden."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage("No pudimos cambiarla. Probá una contraseña más segura o pedí un enlace nuevo."); return; }
    await navigate({ to: "/dashboard" });
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-12">
      <Link to="/" className="brand mb-10">
        <span className="brand-mark"><BookOpen size={22} /></span>
        StudyTrack<span className="text-primary">.</span>
      </Link>
      <section className="panel w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Creá una nueva contraseña</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abrí esta página desde el enlace que te enviamos por email.{" "}
            <Link to="/auth" className="text-primary">Volver a ingresar</Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="field">Nueva contraseña<input type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
            <label className="field">Repetí la contraseña<input type="password" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
            {message && <p role="status" className="rounded-md bg-accent p-3 text-sm">{message}</p>}
            <Button className="w-full" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</Button>
          </form>
        )}
      </section>
    </main>
  );
}
