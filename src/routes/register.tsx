import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
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
import { canAccessAdminApp } from "#/features/admin/auth";
import {
  checkFirebaseEmailAvailability,
  loginWithFirebaseIDToken,
} from "#/lib/api/auth";
import { getAuthSession, hydrateAuthSession, saveAuthSession } from "#/lib/auth";
import {
  createFirebaseUser,
  getFirebaseIDToken,
  sendFirebaseEmailVerification,
  signInToFirebaseWithGoogle,
  signOutFromFirebase,
} from "#/lib/firebase";

export const Route = createFileRoute("/register")({
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
  component: RegisterPage,
});

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function RegisterPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const registerForm = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: search.email,
      password: "",
    },
  });
  const registerErrors = registerForm.formState.errors;

  const completeEventyLogin = async (idToken: string) => {
    const authResult = await loginWithFirebaseIDToken(idToken);
    saveAuthSession(authResult);
    return authResult;
  };

  const registerMutation = useMutation({
    mutationFn: async (values: RegisterFormValues) => {
      const email = values.email.trim();
      const availability = await checkFirebaseEmailAvailability(email);
      if (!availability.available) {
        throw new Error("Email is already in use");
      }

      const firebaseUser = await createFirebaseUser(
        values.name.trim(),
        email,
        values.password,
      );
      await sendFirebaseEmailVerification(firebaseUser);
      await signOutFromFirebase();
    },
    onSuccess: async () => {
      toast.success("Verify your email", {
        description: "We sent a verification link. Confirm your email, then log in.",
      });
      await navigate({ to: "/login", search: { email: registerForm.getValues("email") } });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create account",
      );
      toast.error("Failed to create account", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const googleMutation = useMutation({
    mutationFn: async () => {
      const firebaseUser = await signInToFirebaseWithGoogle();
      return completeEventyLogin(await getFirebaseIDToken(firebaseUser));
    },
    onSuccess: async () => {
      toast.success("Signed in with Google", {
        description: "Your Google account is linked to Eventy.",
      });
      await navigate({ to: "/" });
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google",
      );
    },
  });

  async function handleRegister(values: RegisterFormValues) {
    setErrorMessage("");
    await registerMutation.mutateAsync(values);
  }

  function handleGoogleRegister() {
    setErrorMessage("");
    googleMutation.mutate();
  }

  const isWorking = registerMutation.isPending || googleMutation.isPending;

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-8 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            New account
          </Badge>
          <CardTitle className="font-serif text-5xl font-semibold leading-tight">
            Create your Eventy account.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-8">
            Sign up through Firebase, then Eventy links your profile, orders,
            and tickets behind the scenes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <UserPlus className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Firebase sign-up
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Create an account with email and password or continue with
                    Google.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Eventy access</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Eventy verifies your Firebase token and creates your app
                    profile automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="app-surface rounded-[2rem]">
        <CardHeader>
          <Badge variant="secondary" className="w-fit rounded-full">
            Firebase account
          </Badge>
          <CardTitle className="font-serif text-3xl">Register</CardTitle>
          <CardDescription>
            Create your account with Firebase authentication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={registerForm.handleSubmit(handleRegister)}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                autoComplete="name"
                className={getInvalidFieldClass(Boolean(registerErrors.name))}
                {...registerForm.register("name", {
                  required: "Full name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
              <FieldError message={registerErrors.name?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className={getInvalidFieldClass(Boolean(registerErrors.email))}
                {...registerForm.register("email", {
                  required: "Email address is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
              />
              <FieldError message={registerErrors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`pr-11 ${getInvalidFieldClass(Boolean(registerErrors.password)) ?? ""}`.trim()}
                  {...registerForm.register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full text-muted-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              <FieldError message={registerErrors.password?.message} />
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
              disabled={isWorking}
            >
              {registerMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Creating account
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="my-6 h-px bg-border" />

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full rounded-full"
            disabled={isWorking}
            onClick={handleGoogleRegister}
          >
            {googleMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Opening Google
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              to="/login"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Already have an account?
            </Link>
            <Link
              to="/forgot-password"
              className="text-primary underline-offset-4 hover:underline"
            >
              Need password help?
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
