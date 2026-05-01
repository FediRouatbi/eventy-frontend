import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "#/components/ui/input-otp";
import { Label } from "#/components/ui/label";
import { resetPassword } from "#/lib/api/auth";
import { getAuthSession, hydrateAuthSession } from "#/lib/auth";
import { canAccessAdminApp } from "#/features/admin/auth";

export const Route = createFileRoute("/reset-password")({
  beforeLoad: async () => {
    const session = getAuthSession() ?? (await hydrateAuthSession());

    if (session) {
      throw redirect({
        to: canAccessAdminApp(session) ? "/admin" : "/",
      });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  component: ResetPasswordPage,
});

type ResetPasswordFormValues = {
  email: string;
  otp: string;
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
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
  hasError?: boolean;
  registration: ReturnType<typeof useForm<ResetPasswordFormValues>>["register"];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: {
      email: search.email,
      otp: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const errors = form.formState.errors;
  const nextPassword = form.watch("new_password");
  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (_, values) => {
      toast.success("Password reset complete", {
        description: `Your password for ${values.email} has been updated.`,
      });
      navigate({ to: "/login" });
    },
    onError: (error) => {
      toast.error("Failed to reset password", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleSubmit(values: ResetPasswordFormValues) {
    await resetPasswordMutation.mutateAsync({
      email: values.email.trim(),
      token: values.otp.trim(),
      new_password: values.new_password,
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
            Reset your password with an OTP.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            Enter the code from your email and choose a new password for your
            Eventy account, no matter your role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <KeyRound className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">4-digit OTP</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use the code from your inbox exactly as received before it
                    expires.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">New password</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Pick a fresh password with at least 8 characters, then sign
                    in again with the new credentials.
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
            Reset password
          </Badge>
          <CardTitle className="font-serif text-3xl">Enter OTP</CardTitle>
          <CardDescription>
            Complete the reset with your email, OTP, and a new password.
          </CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="otp">OTP code</Label>
              <Controller
                control={form.control}
                name="otp"
                rules={{
                  required: "OTP is required",
                  pattern: {
                    value: /^\d{4}$/,
                    message: "Enter the 4-digit OTP from your email",
                  },
                }}
                render={({ field }) => (
                  <InputOTP
                    id="otp"
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d*"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={errors.otp ? "true" : "false"}
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              <FieldError message={errors.otp?.message} />
            </div>

            <PasswordField
              id="new-password"
              label="New password"
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((current) => !current)}
              hasError={Boolean(errors.new_password)}
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
              className="w-full rounded-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Resetting password
                </>
              ) : (
                "Reset password"
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                to="/forgot-password"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Need a new OTP?
              </Link>
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
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
