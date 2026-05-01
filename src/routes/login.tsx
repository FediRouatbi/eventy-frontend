import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { isAdminRole } from "#/features/admin/auth";
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
  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const authResult = await login(payload);
      saveAuthSession(authResult);
      await getMe();
      return authResult;
    },
    onSuccess: async (authResult) => {
      if (isAdminRole(authResult.user.role)) {
        await navigate({ to: "/admin" });
        return;
      }

      await navigate({ to: "/" });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in",
      );
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    loginMutation.mutate({ email, password });
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-8 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            Account access
          </Badge>
          <CardTitle className="font-serif text-5xl font-semibold leading-tight">
            Sign in to the Eventy workspace.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            Sign in with any Eventy account to continue to your workspace.
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
                    Sessions stay secure with HttpOnly cookies and in-memory access tokens.
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
                    : "No active session on this browser."}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="app-surface rounded-[2rem]">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Authentication
          </Badge>
          <CardTitle className="font-serif text-3xl">Login</CardTitle>
          <CardDescription>
            Use your Eventy email and password.
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
                placeholder="you@example.com"
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
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              to="/register"
              search={{ email }}
              className="text-primary underline-offset-4 hover:underline"
            >
              Create account
            </Link>
            <Link
              to="/forgot-password"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password
            </Link>
            <Link
              to="/reset-password"
              search={{ email }}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Have an OTP?
            </Link>
          </div>

          <div className="mt-5 text-sm leading-6 text-muted-foreground">
            After sign-in, you'll be sent to the right area based on your role.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
