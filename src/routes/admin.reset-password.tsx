import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  AdminPageHeader,
  AdminSectionCard,
} from "#/features/admin/components/AdminSurface";
import { changePassword } from "#/lib/api/auth";
import { useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/admin/reset-password")({
  component: AdminResetPasswordPage,
});

type ResetPasswordFormValues = {
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
  autoComplete,
  hasError,
  visible,
  onToggle,
  registration,
}: {
  id: string;
  label: string;
  autoComplete: string;
  hasError?: boolean;
  visible: boolean;
  onToggle: () => void;
  registration: ReturnType<typeof useForm<ResetPasswordFormValues>>["register"];
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

function AdminResetPasswordPage() {
  const session = useAuthSession();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const errors = form.formState.errors;
  const nextPassword = form.watch("new_password");
  const changePasswordMutation = useMutation({
    mutationFn: async (values: ResetPasswordFormValues) => {
      if (!session) {
        throw new Error("You need to be signed in to change your password");
      }

      return changePassword(session.access_token, {
        current_password: values.current_password,
        new_password: values.new_password,
      });
    },
    onSuccess: () => {
      form.reset();
      toast.success("Password updated", {
        description: "Your admin password has been changed successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update password", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleSubmit(values: ResetPasswordFormValues) {
    await changePasswordMutation.mutateAsync(values);
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        badge="Security"
        title="Reset password"
        description="Update your current admin password. This page is available to organizer admins and super admins."
      />

      <AdminSectionCard
        title="Change password"
        description="Use your current password, then choose a new one with at least 8 characters."
      >
        <Card className="rounded-[1.35rem] border-border/70 bg-background/80 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 text-primary" />
              <p>
                You are changing the password for{" "}
                <strong>{session?.user.email}</strong>.
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <PasswordField
                id="current-password"
                label="Current password"
                autoComplete="current-password"
                hasError={Boolean(errors.current_password)}
                visible={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((current) => !current)}
                registration={form.register("current_password", {
                  required: "Current password is required",
                })}
              />
              <FieldError message={errors.current_password?.message} />

              <PasswordField
                id="new-password"
                label="New password"
                autoComplete="new-password"
                hasError={Boolean(errors.new_password)}
                visible={showNewPassword}
                onToggle={() => setShowNewPassword((current) => !current)}
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
                autoComplete="new-password"
                hasError={Boolean(errors.confirm_password)}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                registration={form.register("confirm_password", {
                  required: "Please confirm the new password",
                  validate: (value) =>
                    value === nextPassword || "Passwords do not match",
                })}
              />
              <FieldError message={errors.confirm_password?.message} />

              <Button
                type="submit"
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
      </AdminSectionCard>
    </div>
  );
}
