"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";

export function CompleteBookingAction({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function markComplete() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Service completion could not be recorded.");
        return;
      }
      router.refresh();
    } catch {
      setError("Service completion could not be recorded. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button disabled={saving} onClick={markComplete} type="button" variant="outline">
        {saving ? "Recording completion…" : "Mark service completed"}
      </Button>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
