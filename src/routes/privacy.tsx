import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="space-y-4">
        <Badge variant="outline" className="w-fit rounded-full">
          Privacy
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          Privacy that respects the booking journey.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">
          Eventy uses account, booking, and organizer data to run the platform,
          process transactions, and improve the experience across discovery and
          checkout.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">What we collect</CardTitle>
            <CardDescription>
              Core information needed to support accounts and event activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>Name, email address, sign-in details, and booking-related activity.</p>
            <p>Organizer content, event details, and operational records for platform administration.</p>
            <p>Basic technical information used for security, performance, and fraud prevention.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">How it is used</CardTitle>
            <CardDescription>
              Information is used to operate Eventy and keep transactions reliable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>To create accounts, verify identity, and manage access.</p>
            <p>To support bookings, notifications, and event discovery.</p>
            <p>To maintain product quality, platform safety, and organizer workflows.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Questions</CardTitle>
            <CardDescription>
              Reach out if you need help with privacy-related requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            <p>
              Contact the Eventy team through the support page for access,
              correction, or account-related privacy questions.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
