import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
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
import { isAdminRole } from "#/features/admin/auth";
import { changePassword } from "#/lib/api/auth";
import { getAuthSession, useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/account/security")({
  beforeLoad: () => {
    const session = getAuthSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (isAdminRole(session.user.role)) {
      throw redirect({ to: "/admin/reset-password" });
    }
  },
  component: AccountSecurityPage,
});

type ChangePasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function PasswordField({
  id,
  label,
  visible,
  onToggle,
  hasError,
  registration,
  autoComplete,
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
  hasError?: boolean;
  registration: ReturnType<typeof useForm<ChangePasswordFormValues>>["register"];
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className={`pr-11 ${getInvalidFieldClass(hasError) ?? ""}`.trim()}
          {...registration}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full text-muted-foreground"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function AccountSecurityPage() {
  const session = useAuthSession();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const nextPassword = form.watch("new_password");
  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) => {
      if (!session) {
        throw new Error("You need to be signed in");
      }

      return changePassword(session.access_token, {
        current_password: values.current_password,
        new_password: values.new_password,
      });
    },
    onSuccess: () => {
      form.reset();
      toast.success("Password updated", {
        description: "Your account password was changed successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update password", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleSubmit(values: ChangePasswordFormValues) {
    await changePasswordMutation.mutateAsync(values);
  }

  const errors = form.formState.errors;

  if (!session || isAdminRole(session.user.role)) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Badge variant="outline" className="w-fit rounded-full">
          Security
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Change your password
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Keep your Eventy user account secure by setting a fresh password any
          time you need to.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              Password settings
            </CardTitle>
            <CardDescription>
              Enter your current password, then choose a new one with at least
              8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <PasswordField
                id="current-password"
                label="Current password"
                visible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((current) => !current)}
                hasError={Boolean(errors.current_password)}
                autoComplete="current-password"
                registration={form.register("current_password", {
                  required: "Current password is required",
                })}
              />
              <FieldError message={errors.current_password?.message} />

              <PasswordField
                id="new-password"
                label="New password"
                visible={showNewPassword}
                onToggle={() => setShowNewPassword((current) => !current)}
                hasError={Boolean(errors.new_password)}
                autoComplete="new-password"
                registration={form.register("new_password", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              <FieldError message={errors.new_password?.message} />

              <PasswordField
                id="confirm-password"
                label="Confirm new password"
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                hasError={Boolean(errors.confirm_password)}
                autoComplete="new-password"
                registration={form.register("confirm_password", {
                  required: "Please confirm the new password",
                  validate: (value) =>
                    value === nextPassword || "Passwords do not match",
                })}
              />
              <FieldError message={errors.confirm_password?.message} />

              <Button
                type="submit"
                size="lg"
                className="rounded-full"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Updating password
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] bg-card/80">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              Why this matters
            </CardTitle>
            <CardDescription>
              A strong password protects your bookings, tickets, and account
              activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <ShieldCheck className="mt-0.5 size-5 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Use a password you do not reuse elsewhere, and update it
                immediately if you suspect your account was exposed.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <KeyRound className="mt-0.5 size-5 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                If you forget your password later, you can still recover access
                from the public OTP reset flow.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
