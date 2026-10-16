import type { ComponentProps } from "react";
import { Input } from "./input";

export function NumberInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  return <Input inputMode="decimal" type="number" {...props} />;
}
