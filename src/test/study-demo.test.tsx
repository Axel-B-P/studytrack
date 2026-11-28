import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { DemoApp } from "@/components/study/app";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/study/ai-coach", () => ({ AiCoach: () => null }));
vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));

it("renders the public demo without a personal timer provider", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  expect(() =>
    render(
      <QueryClientProvider client={queryClient}>
        <DemoApp />
      </QueryClientProvider>,
    ),
  ).not.toThrow();
  queryClient.clear();
});