import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="space-y-4">
        <Badge variant="outline" className="w-fit rounded-full">
          Terms
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          Terms for using Eventy.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          These terms cover access to Eventy, customer accounts, organizer
          tooling, and the responsibilities tied to publishing or booking events.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Using the platform</CardTitle>
            <CardDescription>
              Accounts should be used lawfully and with accurate information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>Users are responsible for account security and the accuracy of information they provide.</p>
            <p>Organizers are responsible for the events, schedules, and content they publish.</p>
            <p>Abuse, fraud, or misuse of the platform may lead to restricted access.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Bookings and access</CardTitle>
            <CardDescription>
              Eventy supports discovery and transaction flows, while event terms may vary by organizer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>Availability, pricing, and event entry rules can change based on organizer decisions.</p>
            <p>Refund and cancellation terms may differ from one event to another.</p>
            <p>Users should review organizer-specific event details before completing a booking.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Updates</CardTitle>
            <CardDescription>
              These terms may evolve as the product and organizer tooling expand.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            <p>
              Continued use of Eventy after future updates means you accept the
              revised terms then in effect.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
