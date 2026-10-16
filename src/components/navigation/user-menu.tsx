"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { LogoutForm } from "@/src/features/auth/components/auth-forms";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";

export function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open account menu" className="gap-2 rounded-full" variant="outline">
          <span className="grid size-7 place-items-center rounded-full bg-secondary text-primary"><UserRound aria-hidden="true" size={15} /></span>
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/account">Account settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/account/change-password">Change password</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutForm />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
