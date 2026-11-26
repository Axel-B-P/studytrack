import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { StudyTimerProvider } from "@/components/study/timer-state";

function AuthenticatedLayout() {
  return (
    <StudyTimerProvider>
      <Outlet />
    </StudyTimerProvider>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});
