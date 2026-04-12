import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "#/components/ui/input-otp";
import { Label } from "#/components/ui/label";
import {
  register,
  resendRegisterOtp,
  verifyRegisterOtp,
} from "#/lib/api/auth";
import { getAuthSession, saveAuthSession } from "#/lib/auth";
import { canAccessAdminApp } from "#/features/admin/auth";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    const session = getAuthSession();

    if (session) {
      throw redirect({
        to: canAccessAdminApp(session) ? "/admin" : "/",
      });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
    step: search.step === "verify" ? "verify" : "details",
  }),
  component: RegisterPage,
});

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

type VerifyOtpFormValues = {
  email: string;
  otp: string;
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
  const registerForm = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: search.email,
      password: "",
    },
  });
  const verifyForm = useForm<VerifyOtpFormValues>({
    defaultValues: {
      email: search.email,
      otp: "",
    },
  });

  useEffect(() => {
    registerForm.setValue("email", search.email);
    verifyForm.reset({
      email: search.email,
      otp: "",
    });
  }, [registerForm, search.email, verifyForm]);

  const registerErrors = registerForm.formState.errors;
  const verifyErrors = verifyForm.formState.errors;

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (_, values) => {
      toast.success("Registration started", {
        description: `We sent a verification OTP to ${values.email}.`,
      });
      verifyForm.reset({
        email: values.email,
        otp: "",
      });
      navigate({
        to: "/register",
        search: {
          email: values.email,
          step: "verify",
        },
      });
    },
    onError: (error) => {
      toast.error("Failed to create account", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyRegisterOtp,
    onSuccess: (authResult) => {
      saveAuthSession(authResult);
      toast.success("Registration complete", {
        description: "Your account is verified and you are now signed in.",
      });
      navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error("Failed to verify OTP", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: resendRegisterOtp,
    onSuccess: (_, values) => {
      toast.success("Verification OTP resent", {
        description: `A new OTP was sent to ${values.email}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to resend OTP", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleRegister(values: RegisterFormValues) {
    await registerMutation.mutateAsync({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    });
  }

  async function handleVerify(values: VerifyOtpFormValues) {
    await verifyMutation.mutateAsync({
      email: values.email.trim(),
      otp: values.otp.trim(),
    });
  }

  const isVerifyStep = search.step === "verify";

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
            Register as a normal user, verify your email with an OTP, and start
            discovering events right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <UserPlus className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Quick sign-up</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Create a customer account with your name, email, and
                    password in a few seconds.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/75">
              <CardContent className="flex items-start gap-3 p-5">
                <MailCheck className="mt-0.5 size-5 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">OTP verification</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    We send a 4-digit code to your inbox before the account is
                    activated.
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
            {isVerifyStep ? "Verify account" : "Create account"}
          </Badge>
          <CardTitle className="font-serif text-3xl">
            {isVerifyStep ? "Enter your OTP" : "Register"}
          </CardTitle>
          <CardDescription>
            {isVerifyStep
              ? "Complete registration with the OTP we sent to your email."
              : "Create your account with your name, email, and password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isVerifyStep ? (
            <form
              className="space-y-5"
              onSubmit={verifyForm.handleSubmit(handleVerify)}
            >
              <div className="space-y-2">
                <Label htmlFor="verify-email">Email address</Label>
                <Input
                  id="verify-email"
                  type="email"
                  autoComplete="email"
                  className={getInvalidFieldClass(Boolean(verifyErrors.email))}
                  {...verifyForm.register("email", {
                    required: "Email address is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                <FieldError message={verifyErrors.email?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">OTP code</Label>
                <Controller
                  control={verifyForm.control}
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
                      aria-invalid={verifyErrors.otp ? "true" : "false"}
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
                <FieldError message={verifyErrors.otp?.message} />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Verifying account
                  </>
                ) : (
                  "Verify and sign in"
                )}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() =>
                    navigate({
                      to: "/register",
                      search: {
                        email: verifyForm.getValues("email"),
                        step: "details",
                      },
                    })
                  }
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline disabled:text-muted-foreground"
                  disabled={
                    resendOtpMutation.isPending || !verifyForm.watch("email")
                  }
                  onClick={() =>
                    resendOtpMutation.mutate({
                      email: verifyForm.getValues("email").trim(),
                    })
                  }
                >
                  {resendOtpMutation.isPending ? "Resending OTP" : "Resend OTP"}
                </button>
              </div>
            </form>
          ) : (
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
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Sending verification OTP
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
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
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
