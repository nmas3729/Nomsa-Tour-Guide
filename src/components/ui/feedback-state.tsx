import { AlertTriangle, Check, CircleX } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

export function ErrorState({ title = "Something went wrong", children }: { title?: string; children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <CircleX aria-hidden="true" className="mb-2" size={18} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function SuccessState({ title = "All set", children }: { title?: string; children: ReactNode }) {
  return (
    <Alert variant="success">
      <Check aria-hidden="true" className="mb-2" size={18} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function WarningState({ title = "Please note", children }: { title?: string; children: ReactNode }) {
  return (
    <Alert variant="warning">
      <AlertTriangle aria-hidden="true" className="mb-2" size={18} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
