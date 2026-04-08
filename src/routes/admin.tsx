import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AdminAppShell } from "#/features/admin/components/AdminAppShell";
import { canAccessAdminApp } from "#/features/admin/auth";
import { useAuthSession } from "#/lib/auth";
import { Card, CardContent } from "#/components/ui/card";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const session = useAuthSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    if (!canAccessAdminApp(session)) {
      navigate({ to: "/" });
    }
  }, [navigate, session]);

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
