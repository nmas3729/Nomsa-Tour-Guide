"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";

type GuideOption = { id: string; name: string };

export function AdminCustomRequestAssignment({
  requestId,
  assignedGuideId,
  canAssign,
}: {
  requestId: string;
  assignedGuideId: string | null;
  canAssign: boolean;
}) {
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [selected, setSelected] = useState(assignedGuideId ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/custom-requests/guides", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Approved guide list could not be loaded.");
        if (active) setGuides(result.guides);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Approved guide list could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function assignGuide() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/custom-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", guideProfileId: selected }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Guide could not be assigned.");
      setSaved(true);
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Guide could not be assigned.");
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="grid gap-1 text-xs font-medium">
        Assign to an approved guide
        <select
          className="ui-input min-h-10"
          disabled={!canAssign || loading || saving}
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
        >
          <option value="">Choose a guide</option>
          {guides.map((guide) => <option key={guide.id} value={guide.id}>{guide.name}</option>)}
        </select>
      </label>
      <Button
        className="self-end"
        disabled={!canAssign || loading || saving || !selected}
        onClick={() => void assignGuide()}
        size="sm"
        type="button"
        variant="outline"
      >
        {saving ? "Assigning…" : assignedGuideId ? "Reassign guide" : "Assign guide"}
      </Button>
      {saved ? <p className="text-xs text-success">Guide assigned.</p> : null}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
