import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChangePasswordForm,
  ForgotPasswordForm,
  LoginForm,
  RegistrationForm,
  ResetPasswordForm,
  VerifyEmailForm,
} from "./auth-forms";

vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/src/features/auth/actions", () => ({
  changePasswordAction: vi.fn(),
  forgotPasswordAction: vi.fn(),
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
  registerAction: vi.fn(),
  resendVerificationAction: vi.fn(),
  resetPasswordAction: vi.fn(),
  verifyEmailAction: vi.fn(),
}));

afterEach(cleanup);

describe("authentication forms", () => {
  it.each([
    ["login", () => <LoginForm />],
    ["registration", () => <RegistrationForm />],
    ["forgot password", () => <ForgotPasswordForm />],
    ["password reset", () => <ResetPasswordForm token="qa-token" />],
    ["email verification", () => <VerifyEmailForm token="qa-token" />],
    ["password change", () => <ChangePasswordForm />],
  ])("uses POST as the native fallback for the %s form", (_name, renderForm) => {
    const { container } = render(renderForm());

    const forms = container.querySelectorAll("form");
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) {
      expect(form).toHaveAttribute("method", "post");
    }
  });
});
