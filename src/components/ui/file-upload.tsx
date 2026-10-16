import { Upload } from "lucide-react";
import type { ComponentProps } from "react";
import { Label } from "./label";

export function FileUpload({
  id,
  label,
  helpText,
  ...props
}: ComponentProps<"input"> & { label: string; helpText?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center transition-colors hover:bg-muted"
        htmlFor={id}
      >
        <Upload aria-hidden="true" className="text-primary" size={20} />
        <span className="text-sm font-medium">Choose a file or drag it here</span>
        {helpText ? <span className="text-xs text-muted-foreground">{helpText}</span> : null}
        <input className="sr-only" id={id} type="file" {...props} />
      </label>
    </div>
  );
}
