import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminAppShell } from "#/features/admin/components/AdminAppShell";
import { canAccessAdminApp } from "#/features/admin/auth";
import { getAuthSession, hydrateAuthSession, useAuthSession } from "#/lib/auth";
import { Card, CardContent } from "#/components/ui/card";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = getAuthSession() ?? (await hydrateAuthSession());

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (!canAccessAdminApp(session)) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const session = useAuthSession();

  if (!session || !canAccessAdminApp(session)) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-14">
        <Card className="rounded-[2rem]">
          <CardContent className="p-8 text-sm text-muted-foreground">
            Preparing admin workspace...
          </CardContent>
        </Card>
      </main>
    );
  }

  return <AdminAppShell session={session} />;
}
