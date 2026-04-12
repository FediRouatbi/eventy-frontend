import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="space-y-4">
        <Badge variant="outline" className="w-fit rounded-full">
          Support
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          Help for accounts, bookings, and organizer access.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          Use this page when you need help with sign-in, verification codes,
          password recovery, or organizer account access.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Customer help</CardTitle>
            <CardDescription>
              Common account and booking support paths.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>OTP not arriving or expired.</p>
            <p>Password reset and sign-in issues.</p>
            <p>Questions about account updates or access.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Organizer help</CardTitle>
            <CardDescription>
              Access support for admins managing events and operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>Organizer admin sign-in support.</p>
            <p>Event publishing and management questions.</p>
            <p>Operational or account recovery help.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-[2rem]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Contact</CardTitle>
          <CardDescription>
            Reach the Eventy team for direct follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7 text-muted-foreground">
          <p>Email: support@eventy.app</p>
          <p>Response times may vary depending on account and booking volume.</p>
        </CardContent>
      </Card>
    </main>
  );
}
