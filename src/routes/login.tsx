import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, LoaderCircle, ShieldCheck } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { getMe, login } from "#/lib/api/auth";
import { saveAuthSession, useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const authResult = await login({ email, password });
      saveAuthSession(authResult);
      await getMe();
      navigate({ to: "/admin" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-8 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            Admin access
          </Badge>
          <CardTitle className="font-serif text-5xl font-semibold leading-tight">
            Sign in to the Eventy workspace.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            This route stays out of the public navigation, but it now connects
            to the live auth API so organizer admins and super admins can enter
            the dashboard foundation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Protected access
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Tokens are stored locally so we can build the dashboard
                    experience incrementally from a real session.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="p-5">
                <p className="font-medium text-foreground">Current status</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {session
                    ? `Signed in as ${session.user.email}`
                    : "No active admin session on this browser."}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] bg-card/95">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Authentication
          </Badge>
          <CardTitle className="font-serif text-3xl">Admin login</CardTitle>
          <CardDescription>
            Use an organizer admin or super admin account from the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="organizer@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {errorMessage ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4" />
                  <p>{errorMessage}</p>
                </CardContent>
              </Card>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Continue to dashboard"
              )}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="text-sm leading-6 text-muted-foreground">
            This route remains hidden from the public navbar and serves only as
            the entry point to the admin workspace.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
