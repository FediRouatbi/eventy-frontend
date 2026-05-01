import {
  Link,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
import { getAuthSession, hydrateAuthSession } from "#/lib/auth";
import { canAccessAdminApp } from "#/features/admin/auth";
import { sendFirebasePasswordReset } from "#/lib/firebase";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: async () => {
    const session = getAuthSession() ?? (await hydrateAuthSession());

    if (session) {
      throw redirect({
        to: canAccessAdminApp(session) ? "/admin" : "/",
      });
    }
  },
  component: ForgotPasswordPage,
});

type ForgotPasswordFormValues = {
  email: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: "",
    },
  });

  const errors = form.formState.errors;
  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) =>
      sendFirebasePasswordReset(email),
    onSuccess: (_, values) => {
      toast.success("Reset email sent", {
        description: `Firebase sent password reset instructions to ${values.email}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to send reset email", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleSubmit(values: ForgotPasswordFormValues) {
    await forgotPasswordMutation.mutateAsync({
      email: values.email.trim(),
    });
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-8 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            Account recovery
          </Badge>
          <CardTitle className="font-serif text-5xl font-semibold leading-tight">
            Send a Firebase password reset.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            Enter the email tied to your Eventy account and Firebase will send
            secure reset instructions to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <MailCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Reset by email</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Firebase sends the reset link and manages password updates
                    for web sign-in.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Secure recovery</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Eventy keeps app access separate and verifies Firebase
                    tokens after sign-in.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] bg-card/95">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Forgot password
          </Badge>
          <CardTitle className="font-serif text-3xl">
            Request reset email
          </CardTitle>
          <CardDescription>Use the email address on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className={getInvalidFieldClass(Boolean(errors.email))}
                {...form.register("email", {
                  required: "Email address is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Sending reset email
                </>
              ) : (
                "Send reset email"
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                to="/login"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
