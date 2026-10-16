import type { ReactNode } from "react";

function EmailFrame({ children }: { children: ReactNode }) {
  return (
    <html>
      <body
        style={{
          backgroundColor: "#f3f0e8",
          color: "#17221d",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <main
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "40px",
          }}
        >
          <p style={{ color: "#57745f", fontSize: "13px", fontWeight: 700, letterSpacing: "2px" }}>
            NOMSA TOUR GUIDES
          </p>
          {children}
          <p style={{ color: "#68766f", fontSize: "13px", lineHeight: 1.6 }}>
            If you did not request this, you can safely ignore this email.
          </p>
        </main>
      </body>
    </html>
  );
}

function ActionLink({ url, children }: { url: string; children: string }) {
  return (
    <a
      href={url}
      style={{
        backgroundColor: "#1e4435",
        borderRadius: "8px",
        color: "#ffffff",
        display: "inline-block",
        fontWeight: 700,
        margin: "16px 0",
        padding: "14px 20px",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

export function VerifyEmailEmail({ name, url }: { name: string; url: string }) {
  return (
    <EmailFrame>
      <h1 style={{ fontSize: "26px", lineHeight: 1.3 }}>Verify your email</h1>
      <p>Hi {name},</p>
      <p>Confirm your email address to finish setting up your Nomsa Tour Guides account.</p>
      <ActionLink url={url}>Verify email address</ActionLink>
      <p style={{ color: "#68766f", fontSize: "13px" }}>This link expires in 24 hours.</p>
    </EmailFrame>
  );
}

export function ResetPasswordEmail({ name, url }: { name: string; url: string }) {
  return (
    <EmailFrame>
      <h1 style={{ fontSize: "26px", lineHeight: 1.3 }}>Reset your password</h1>
      <p>Hi {name},</p>
      <p>We received a request to reset the password for your account.</p>
      <ActionLink url={url}>Choose a new password</ActionLink>
      <p style={{ color: "#68766f", fontSize: "13px" }}>This link expires in one hour.</p>
    </EmailFrame>
  );
}

export function WelcomeEmail({ name, url }: { name: string; url: string }) {
  return (
    <EmailFrame>
      <h1 style={{ fontSize: "26px", lineHeight: 1.3 }}>Welcome, {name}</h1>
      <p>Your email is verified and your Nomsa Tour Guides account is ready.</p>
      <ActionLink url={url}>Explore Nomsa Tour Guides</ActionLink>
    </EmailFrame>
  );
}
