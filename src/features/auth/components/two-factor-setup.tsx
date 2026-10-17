"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthNotice } from "@/src/features/auth/components/auth-ui";
import {
  beginAuthenticatorSetupAction,
  confirmAuthenticatorSetupAction,
} from "@/src/features/auth/actions";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

export function TwoFactorSetup() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function startSetup() {
    setIsStarting(true);
    setMessage(null);
    try {
      const result = await beginAuthenticatorSetupAction();
      if (!result.success || !result.secret) {
        setMessage({ text: result.message, success: false });
        return;
      }
      setSecret(result.secret);
      setMessage({ text: result.message, success: true });
    } finally {
      setIsStarting(false);
    }
  }

  async function confirmSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirming(true);
    setMessage(null);
    try {
      const result = await confirmAuthenticatorSetupAction({ code });
      setMessage({ text: result.message, success: result.success });
      if (result.success && result.redirectTo) {
        router.replace(result.redirectTo);
        router.refresh();
      }
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="auth-form">
      <p className="text-sm leading-6 text-muted-foreground">
        Two-factor authentication is required for guide and admin accounts. Use an authenticator app such as
        Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
      </p>
      {!secret ? (
        <Button className="auth-submit" disabled={isStarting} onClick={startSetup} type="button">
          {isStarting ? "Preparing setup…" : "Set up authenticator app"}
        </Button>
      ) : (
        <>
          <div className="grid gap-2 rounded-2xl border border-border bg-secondary/40 p-5">
            <p className="text-sm font-semibold">Add an account manually</p>
            <p className="text-sm text-muted-foreground">Account: your sign-in email · Issuer: Nomsa Tour Guides</p>
            <Label htmlFor="totp-setup-secret">Authenticator setup key</Label>
            <Input
              autoComplete="off"
              className="font-mono tracking-wider"
              id="totp-setup-secret"
              readOnly
              value={secret}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Keep this key private. Enter it in your authenticator app, then use the current 6-digit code below.
            </p>
          </div>
          <form className="grid gap-4" onSubmit={confirmSetup}>
            <div className="grid gap-2">
              <Label htmlFor="totp-confirm-code">6-digit authenticator code</Label>
              <Input
                autoComplete="one-time-code"
                id="totp-confirm-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                pattern="[0-9]{6}"
                required
                value={code}
              />
            </div>
            <Button className="auth-submit" disabled={isConfirming || code.length !== 6} type="submit">
              {isConfirming ? "Verifying…" : "Verify and enable"}
            </Button>
          </form>
        </>
      )}
      {message ? <AuthNotice message={message.text} success={message.success} /> : null}
    </div>
  );
}
