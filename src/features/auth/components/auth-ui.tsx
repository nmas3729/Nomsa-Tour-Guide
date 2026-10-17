import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/src/components/navigation/brand-mark";
import { Button } from "@/src/components/ui/button";
import { Label } from "@/src/components/ui/label";

export function AuthShell({
  eyebrow = "YOUR JOURNEY STARTS HERE",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="auth-brand" href="/" aria-label="Nomsa Tour Guides home">
          <BrandMark className="size-14 rounded-full object-cover" />
          <span>Nomsa Tour Guides</span>
        </Link>
        <div className="auth-heading">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
        </div>
        {children}
        <p className="auth-footnote">Thoughtful journeys, guided by locals.</p>
      </div>
    </main>
  );
}

export function AuthField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = Children.only(children);
  const accessibleControl = isValidElement<{
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>(control)
    ? cloneElement(control, {
        "aria-describedby": descriptionId,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      {accessibleControl}
      {hint && !error ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}
      {error ? <p className="auth-field-error" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}

export function AuthNotice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return (
    <p className={`auth-notice ${success ? "auth-notice-success" : "auth-notice-error"}`} role={success ? "status" : "alert"}>
      {message}
    </p>
  );
}

export function AuthSubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: string;
}) {
  return (
    <Button className="auth-submit" type="submit" disabled={pending}>
      {pending ? "Please wait…" : children}
    </Button>
  );
}
