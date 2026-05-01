import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { type ReactNode, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
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
import {
  confirmFirebasePasswordReset,
  getFirebasePasswordResetEmail,
  verifyFirebaseEmailAction,
} from "#/lib/firebase";

export const Route = createFileRoute("/auth/action")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: typeof search.mode === "string" ? search.mode : "",
    oobCode: typeof search.oobCode === "string" ? search.oobCode : "",
  }),
  component: FirebaseActionPage,
});

type ResetFormValues = {
  password: string;
  confirmPassword: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function PasswordInput({
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
  registration: ReturnType<typeof useForm<ResetFormValues>>["register"];
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

function FirebaseActionPage() {
  const navigate = useNavigate();
  const { mode, oobCode } = Route.useSearch();
  const isVerifyEmail = mode === "verifyEmail";
  const isResetPassword = mode === "resetPassword";

  if (!oobCode || (!isVerifyEmail && !isResetPassword)) {
    return (
      <ActionShell
        badge="Invalid link"
        title="This link cannot be used."
        description="The email link is missing required Firebase information. Request a fresh link and try again."
        icon={<AlertCircle className="size-6" />}
        tone="destructive"
      >
        <Button asChild size="lg" className="w-full rounded-full">
          <Link to="/login">Back to login</Link>
        </Button>
      </ActionShell>
    );
  }

  if (isVerifyEmail) {
    return <VerifyEmailAction code={oobCode} />;
  }

  return <ResetPasswordAction code={oobCode} onDone={() => navigate({ to: "/login" })} />;
}

function VerifyEmailAction({ code }: { code: string }) {
  const verifyQuery = useQuery({
    queryKey: ["firebase", "verify-email", code],
    queryFn: () => verifyFirebaseEmailAction(code),
    retry: false,
  });

  if (verifyQuery.isLoading) {
    return (
      <ActionShell
        badge="Verifying email"
        title="Confirming your email."
        description="Give us a moment while Firebase verifies this link."
        icon={<LoaderCircle className="size-6 animate-spin" />}
      />
    );
  }

  if (verifyQuery.isError) {
    return (
      <ActionShell
        badge="Verification failed"
        title="We could not verify this email."
        description={
          verifyQuery.error instanceof Error
            ? verifyQuery.error.message
            : "This link may be expired or already used."
        }
        icon={<AlertCircle className="size-6" />}
        tone="destructive"
      >
        <Button asChild size="lg" className="w-full rounded-full">
          <Link to="/login">Back to login</Link>
        </Button>
      </ActionShell>
    );
  }

  return (
    <ActionShell
      badge="Email verified"
      title="Your email is confirmed."
      description="You can now sign in to Eventy with this Firebase account."
      icon={<CheckCircle2 className="size-6" />}
      tone="success"
    >
      <Button asChild size="lg" className="w-full rounded-full">
        <Link to="/login">Continue to login</Link>
      </Button>
    </ActionShell>
  );
}

function ResetPasswordAction({
  code,
  onDone,
}: {
  code: string;
  onDone: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<ResetFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const errors = form.formState.errors;
  const password = form.watch("password");
  const resetEmailQuery = useQuery({
    queryKey: ["firebase", "reset-password", code],
    queryFn: () => getFirebasePasswordResetEmail(code),
    retry: false,
  });
  const resetMutation = useMutation({
    mutationFn: (values: ResetFormValues) =>
      confirmFirebasePasswordReset(code, values.password),
    onSuccess: () => {
      toast.success("Password changed", {
        description: "You can now sign in with your new password.",
      });
      onDone();
    },
    onError: (error) => {
      toast.error("Failed to change password", {
        description:
          error instanceof Error ? error.message : "Please request a new reset link.",
      });
    },
  });

  async function handleSubmit(values: ResetFormValues) {
    await resetMutation.mutateAsync(values);
  }

  if (resetEmailQuery.isLoading) {
    return (
      <ActionShell
        badge="Reset password"
        title="Checking your reset link."
        description="Give us a moment while Firebase validates this password reset request."
        icon={<LoaderCircle className="size-6 animate-spin" />}
      />
    );
  }

  if (resetEmailQuery.isError) {
    return (
      <ActionShell
        badge="Reset failed"
        title="This reset link is not valid."
        description={
          resetEmailQuery.error instanceof Error
            ? resetEmailQuery.error.message
            : "This link may be expired or already used."
        }
        icon={<AlertCircle className="size-6" />}
        tone="destructive"
      >
        <Button asChild size="lg" className="w-full rounded-full">
          <Link to="/forgot-password">Request new link</Link>
        </Button>
      </ActionShell>
    );
  }

  return (
    <ActionShell
      badge="Reset password"
      title="Choose a new password."
      description={`Set a new password for ${resetEmailQuery.data}.`}
      icon={<KeyRound className="size-6" />}
    >
      <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <PasswordInput
          id="new-password"
          label="New password"
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          hasError={Boolean(errors.password)}
          registration={form.register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters",
            },
          })}
        />
        <FieldError message={errors.password?.message} />

        <PasswordInput
          id="confirm-password"
          label="Confirm password"
          visible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((value) => !value)}
          hasError={Boolean(errors.confirmPassword)}
          registration={form.register("confirmPassword", {
            required: "Please confirm your password",
            validate: (value) => value === password || "Passwords do not match",
          })}
        />
        <FieldError message={errors.confirmPassword?.message} />

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Changing password
            </>
          ) : (
            "Change password"
          )}
        </Button>
      </form>
    </ActionShell>
  );
}

function ActionShell({
  badge,
  title,
  description,
  icon,
  tone = "default",
  children,
}: {
  badge: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "default" | "success" | "destructive";
  children?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : tone === "destructive"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/12 text-primary";

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-8 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            Firebase account
          </Badge>
          <CardTitle className="font-serif text-5xl font-semibold leading-tight">
            Secure Eventy account actions.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            Email verification and password recovery stay inside Eventy while
            Firebase handles the sensitive account update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <MailCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Email links</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Verification and reset links open in a branded Eventy flow.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Firebase secure</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Eventy validates the action, then Firebase applies the
                    account change.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="app-surface rounded-[2rem]">
        <CardHeader>
          <div className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${toneClass}`}>
            {icon}
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">
            {badge}
          </Badge>
          <CardTitle className="font-serif text-3xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </main>
  );
}
