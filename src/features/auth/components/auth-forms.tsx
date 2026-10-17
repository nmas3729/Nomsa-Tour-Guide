"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserRole } from "@/src/server/db/generated/enums";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registrationSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegistrationInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
} from "@/src/features/auth/schemas";
import {
  changePasswordAction,
  forgotPasswordAction,
  loginAction,
  logoutAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/src/features/auth/actions";
import type { AuthActionResult } from "@/src/features/auth/types";
import { AuthField, AuthNotice, AuthSubmitButton } from "./auth-ui";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

function applyServerErrors(
  result: AuthActionResult,
  setMessage: (message: string) => void,
) {
  setMessage(result.message);
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", callbackUrl },
  });

  async function onSubmit(values: LoginInput) {
    setNotice(null);
    const result = await loginAction(values);
    if (!result.success) {
      applyServerErrors(result, (message) => setNotice({ message, success: false }));
      return;
    }
    router.replace(result.redirectTo ?? "/");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <AuthField id="login-email" label="Email address" error={form.formState.errors.email?.message}>
        <Input autoComplete="email" id="login-email" type="email" {...form.register("email")} />
      </AuthField>
      <AuthField id="login-password" label="Password" error={form.formState.errors.password?.message}>
        <Input autoComplete="current-password" id="login-password" type="password" {...form.register("password")} />
      </AuthField>
      <AuthField
        id="login-totp-code"
        label="Authenticator app code"
        hint="Required for guide and admin accounts. Travellers can leave this blank."
        error={form.formState.errors.totpCode?.message}
      >
        <Input
          autoComplete="one-time-code"
          id="login-totp-code"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          {...form.register("totpCode")}
        />
      </AuthField>
      <div className="auth-inline-link">
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <AuthSubmitButton pending={form.formState.isSubmitting}>Sign in</AuthSubmitButton>
      <p className="auth-switch">New to Nomsa? <Link href="/register">Create an account</Link></p>
    </form>
  );
}

export function RegistrationForm() {
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.CUSTOMER,
      phone: "",
      biography: "",
      yearsExperience: 0,
      emergencyContactName: "",
      emergencyContactPhone: "",
      businessName: "",
      businessRegistration: "",
      specialties: "",
      languages: "",
      operatingAreas: "",
    },
  });
  const guideRegistration = role === UserRole.GUIDE;

  async function onSubmit(values: RegistrationInput) {
    setNotice(null);
    const result = await registerAction(values);
    setNotice({ message: result.message, success: result.success });
  }

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <AuthField id="register-role" label="I am joining as">
        <Select
          id="register-role"
          {...form.register("role", {
            onChange: (event) => {
              const value = event.target.value;
              if (value === UserRole.CUSTOMER || value === UserRole.GUIDE) {
                setRole(value);
              }
            },
          })}
        >
          <option value={UserRole.CUSTOMER}>A traveller</option>
          <option value={UserRole.GUIDE}>A local guide</option>
        </Select>
      </AuthField>
      <AuthField id="register-name" label="Full name" error={form.formState.errors.name?.message}>
        <Input autoComplete="name" id="register-name" {...form.register("name")} />
      </AuthField>
      <AuthField id="register-email" label="Email address" error={form.formState.errors.email?.message}>
        <Input autoComplete="email" id="register-email" type="email" {...form.register("email")} />
      </AuthField>
      {guideRegistration ? (
        <>
          <p className="auth-hint">
            Guide applications are reviewed manually by the Nomsa team. Approval does not automatically publish a profile.
          </p>
          <AuthField id="register-phone" label="Phone" error={form.formState.errors.phone?.message}>
            <Input autoComplete="tel" id="register-phone" type="tel" {...form.register("phone")} />
          </AuthField>
          <AuthField id="register-biography" label="Guide biography" hint="At least 40 characters." error={form.formState.errors.biography?.message}>
            <Textarea id="register-biography" rows={4} {...form.register("biography")} />
          </AuthField>
          <AuthField id="register-experience" label="Years of guiding experience" error={form.formState.errors.yearsExperience?.message}>
            <Input id="register-experience" type="number" min="0" max="80" {...form.register("yearsExperience")} />
          </AuthField>
          <AuthField id="register-specialties" label="Specialities" hint="Separate items with commas.">
            <Input id="register-specialties" {...form.register("specialties")} />
          </AuthField>
          <AuthField id="register-languages" label="Languages" hint="Separate items with commas.">
            <Input id="register-languages" {...form.register("languages")} />
          </AuthField>
          <AuthField id="register-areas" label="Operating areas" hint="Separate places with commas.">
            <Input id="register-areas" {...form.register("operatingAreas")} />
          </AuthField>
          <AuthField id="register-business" label="Business name (optional)">
            <Input id="register-business" {...form.register("businessName")} />
          </AuthField>
          <AuthField id="register-business-registration" label="Business registration (optional)">
            <Input id="register-business-registration" {...form.register("businessRegistration")} />
          </AuthField>
          <div className="auth-form-section">
            <h2>Emergency contact</h2>
          </div>
          <AuthField id="register-emergency-name" label="Contact name" error={form.formState.errors.emergencyContactName?.message}>
            <Input id="register-emergency-name" {...form.register("emergencyContactName")} />
          </AuthField>
          <AuthField id="register-emergency-phone" label="Contact phone" error={form.formState.errors.emergencyContactPhone?.message}>
            <Input id="register-emergency-phone" type="tel" {...form.register("emergencyContactPhone")} />
          </AuthField>
        </>
      ) : null}
      <AuthField id="register-password" label="Password" hint="12+ characters with upper/lowercase, a number, and a symbol." error={form.formState.errors.password?.message}>
        <Input autoComplete="new-password" id="register-password" type="password" {...form.register("password")} />
      </AuthField>
      <AuthField id="register-confirm-password" label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
        <Input autoComplete="new-password" id="register-confirm-password" type="password" {...form.register("confirmPassword")} />
      </AuthField>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <AuthSubmitButton pending={form.formState.isSubmitting}>Create account</AuthSubmitButton>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Your information is handled according to our{" "}
        <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy">
          Privacy Notice
        </Link>.
      </p>
      <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    const result = await forgotPasswordAction(values);
    setNotice({ message: result.message, success: result.success });
  }

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <AuthField id="forgot-email" label="Email address" error={form.formState.errors.email?.message}>
        <Input autoComplete="email" id="forgot-email" type="email" {...form.register("email")} />
      </AuthField>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <AuthSubmitButton pending={form.formState.isSubmitting}>Send reset link</AuthSubmitButton>
      <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    const result = await resetPasswordAction(values);
    setNotice({ message: result.message, success: result.success });
    if (result.success) {
      router.replace("/login");
    }
  }

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <AuthField id="reset-password" label="New password" hint="12+ characters with upper/lowercase, a number, and a symbol." error={form.formState.errors.password?.message}>
        <Input autoComplete="new-password" id="reset-password" type="password" {...form.register("password")} />
      </AuthField>
      <AuthField id="reset-confirm-password" label="Confirm new password" error={form.formState.errors.confirmPassword?.message}>
        <Input autoComplete="new-password" id="reset-confirm-password" type="password" {...form.register("confirmPassword")} />
      </AuthField>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <AuthSubmitButton pending={form.formState.isSubmitting}>Reset password</AuthSubmitButton>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token?: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const verifyForm = useForm<{ token: string }>({
    defaultValues: { token: token ?? "" },
  });
  const resendForm = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: "" },
  });

  async function verify() {
    const result = await verifyEmailAction({ token: verifyForm.getValues("token") });
    setNotice({ message: result.message, success: result.success });
    if (result.success) {
      router.replace("/login?verified=1");
    }
  }

  async function resend(values: ResendVerificationInput) {
    const result = await resendVerificationAction(values);
    setNotice({ message: result.message, success: result.success });
  }

  return (
    <div className="auth-form">
      {token ? (
        <form onSubmit={verifyForm.handleSubmit(verify)} noValidate>
          <Input type="hidden" {...verifyForm.register("token")} />
          <AuthSubmitButton pending={verifyForm.formState.isSubmitting}>Verify email</AuthSubmitButton>
        </form>
      ) : null}
      <div className="auth-form-section">
        <h2>{token ? "Need another link?" : "Request a verification link"}</h2>
        <p>Enter the email address used to create your account.</p>
      </div>
      <form onSubmit={resendForm.handleSubmit(resend)} noValidate>
        <AuthField id="verify-email" label="Email address" error={resendForm.formState.errors.email?.message}>
          <Input
            autoComplete="email"
            id="verify-email"
            type="email"
            {...resendForm.register("email")}
          />
        </AuthField>
        <AuthSubmitButton pending={resendForm.formState.isSubmitting}>Resend verification email</AuthSubmitButton>
      </form>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
    </div>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePasswordAction(values);
    setNotice({ message: result.message, success: result.success });
    if (result.redirectTo) {
      router.replace(result.redirectTo);
    }
  }

  return (
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <AuthField id="change-current-password" label="Current password" error={form.formState.errors.currentPassword?.message}>
        <Input autoComplete="current-password" id="change-current-password" type="password" {...form.register("currentPassword")} />
      </AuthField>
      <AuthField id="change-password" label="New password" hint="12+ characters with upper/lowercase, a number, and a symbol." error={form.formState.errors.password?.message}>
        <Input autoComplete="new-password" id="change-password" type="password" {...form.register("password")} />
      </AuthField>
      <AuthField id="change-confirm-password" label="Confirm new password" error={form.formState.errors.confirmPassword?.message}>
        <Input autoComplete="new-password" id="change-confirm-password" type="password" {...form.register("confirmPassword")} />
      </AuthField>
      {notice ? <AuthNotice message={notice.message} success={notice.success} /> : null}
      <AuthSubmitButton pending={form.formState.isSubmitting}>Change password</AuthSubmitButton>
    </form>
  );
}

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <Button className="auth-submit" type="submit">Sign out</Button>
    </form>
  );
}
