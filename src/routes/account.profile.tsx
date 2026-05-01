import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
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
import { deleteProfile, getMe, updateProfile } from "#/lib/api/auth";
import {
  clearAuthSession,
  getAuthSession,
  hydrateAuthSession,
  updateAuthSessionUser,
  useAuthSession,
} from "#/lib/auth";

export const Route = createFileRoute("/account/profile")({
  beforeLoad: async () => {
    const session = getAuthSession() ?? (await hydrateAuthSession());

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (isAdminRole(session.user.role)) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AccountProfilePage,
});

type ProfileFormValues = {
  name: string;
  email: string;
};

type DeleteAccountFormValues = {
  current_password: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function AccountProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useAuthSession();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: "",
      email: "",
    },
  });
  const deleteForm = useForm<DeleteAccountFormValues>({
    defaultValues: {
      current_password: "",
    },
  });

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => getMe(),
    enabled: Boolean(session && !isAdminRole(session.user.role)),
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        name: profileQuery.data.name,
        email: profileQuery.data.email,
      });
    }
  }, [form, profileQuery.data]);

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      if (!session) {
        throw new Error("You need to be signed in");
      }

      return updateProfile(session.access_token, values);
    },
    onSuccess: (profile) => {
      updateAuthSessionUser(profile);
      queryClient.setQueryData(["auth", "me"], profile);
      toast.success("Profile updated", {
        description: "Your account details were saved successfully.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (values: DeleteAccountFormValues) => {
      if (!session) {
        throw new Error("You need to be signed in");
      }

      await deleteProfile(session.access_token, values);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["auth", "me"] });
      clearAuthSession();
      deleteForm.reset();
      setIsDeleteDialogOpen(false);
      toast.success("Account deleted", {
        description: "Your Eventy account has been deleted successfully.",
      });
      void navigate({ to: "/login" });
    },
    onError: (error) => {
      toast.error("Failed to delete account", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleSubmit(values: ProfileFormValues) {
    await profileMutation.mutateAsync({
      name: values.name.trim(),
      email: values.email.trim(),
    });
  }

  async function handleDeleteAccount(values: DeleteAccountFormValues) {
    await deleteAccountMutation.mutateAsync({
      current_password: values.current_password.trim(),
    });
  }

  const errors = form.formState.errors;
  const deleteErrors = deleteForm.formState.errors;

  if (!session || isAdminRole(session.user.role)) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Badge variant="outline" className="w-fit rounded-full">
          Account
        </Badge>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Update your profile
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Keep your normal user account details current so your bookings and
          notifications stay accurate.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem]">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              Profile details
            </CardTitle>
            <CardDescription>
              Update your name and email address for this Eventy account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileQuery.isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading your profile...
              </div>
            ) : profileQuery.isError ? (
              <div className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4" />
                  <p>
                    {profileQuery.error instanceof Error
                      ? profileQuery.error.message
                      : "We could not load your profile right now."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => profileQuery.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : (
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  className={getInvalidFieldClass(Boolean(errors.name))}
                  {...form.register("name", {
                    required: "Full name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                  })}
                />
                <FieldError message={errors.name?.message} />
              </div>

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
                className="rounded-full"
                disabled={profileMutation.isPending || profileQuery.isLoading}
              >
                {profileMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving changes
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save profile
                  </>
                )}
              </Button>
            </form>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] bg-card/80">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              Account summary
            </CardTitle>
            <CardDescription>
              A quick view of the account you are currently using.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <UserRound className="size-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-lg font-semibold text-foreground">
                {profileQuery.data?.name ?? session?.user.name ?? "Loading..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">
                {profileQuery.data?.email ?? session?.user.email ?? "Loading..."}
              </p>
            </div>
            <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                Delete account
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Enter your current password to permanently remove your profile
                and sign out across Eventy.
              </p>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                  setIsDeleteDialogOpen(open);
                  if (!open) {
                    deleteForm.reset();
                    setShowDeletePassword(false);
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="mt-4 rounded-full"
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Deleting account
                      </>
                    ) : (
                      "Delete account"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Confirm with your current
                      password to permanently remove your Eventy profile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={deleteForm.handleSubmit(handleDeleteAccount)}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="delete-current-password">
                        Current password
                      </Label>
                      <div className="relative">
                        <Input
                          id="delete-current-password"
                          type={showDeletePassword ? "text" : "password"}
                          autoComplete="current-password"
                          className={`pr-11 ${getInvalidFieldClass(
                            Boolean(deleteErrors.current_password),
                          ) ?? ""}`.trim()}
                          {...deleteForm.register("current_password", {
                            required: "Current password is required",
                          })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full text-muted-foreground"
                          onClick={() => setShowDeletePassword((value) => !value)}
                          aria-label={
                            showDeletePassword
                              ? "Hide current password"
                              : "Show current password"
                          }
                        >
                          {showDeletePassword ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4" />
                          )}
                        </Button>
                      </div>
                      <FieldError
                        message={deleteErrors.current_password?.message}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={deleteAccountMutation.isPending}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        type="submit"
                        variant="destructive"
                        className="rounded-full"
                        disabled={deleteAccountMutation.isPending}
                      >
                        {deleteAccountMutation.isPending
                          ? "Deleting..."
                          : "Yes, delete account"}
                      </Button>
                    </AlertDialogFooter>
                  </form>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
