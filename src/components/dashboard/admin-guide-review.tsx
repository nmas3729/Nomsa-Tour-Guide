"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GuideApplicationStatus, GuideDocumentType } from "@/src/server/db/generated/enums";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { formatCurrency } from "@/src/lib/format";

type ApplicationRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: GuideApplicationStatus;
  biography: string;
  yearsExperience: number;
  languages: string[];
  operatingAreas: string[];
  qualifications: string[];
  specialties: string[];
  permitsRequired: boolean;
  serviceTitle: string | null;
  serviceDescription: string | null;
  serviceCancellationPolicy: string | null;
  serviceDurationMinutes: number | null;
  serviceMeetingPoint: string | null;
  serviceMinGuests: number | null;
  serviceMaxGuests: number | null;
  serviceInclusions: string[];
  serviceExclusions: string[];
  servicePrice: string | null;
  serviceCurrency: string | null;
  adminNotes: string | null;
  submittedAt: string;
  applicant: { guideProfile: { profilePhoto: string | null } | null };
  documents: Array<{
    id: string;
    documentType: GuideDocumentType;
    originalFilename: string;
    sizeBytes: number;
  }>;
};

type ExperienceRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  meetingPoint: string | null;
  maxGuests: number;
  minGuests: number;
  inclusions: string[];
  exclusions: string[];
  cancellationPolicy: string;
  price: string;
  currency: string;
  status: string;
  verificationStatus: GuideApplicationStatus;
  category: { name: string };
  destination: { name: string; city: { province: { name: string } } };
  guide: { user: { name: string; email: string }; verificationStatus: GuideApplicationStatus };
};

type ReviewQueues = { applications: ApplicationRecord[]; experiences: ExperienceRecord[] };

const applicationDecisions = [
  GuideApplicationStatus.UNDER_REVIEW,
  GuideApplicationStatus.CHANGES_REQUESTED,
  GuideApplicationStatus.APPROVED,
  GuideApplicationStatus.REJECTED,
  GuideApplicationStatus.SUSPENDED,
];
const experienceDecisions = [
  GuideApplicationStatus.DRAFT,
  GuideApplicationStatus.SUBMITTED,
  GuideApplicationStatus.APPROVED,
  GuideApplicationStatus.CHANGES_REQUESTED,
  GuideApplicationStatus.REJECTED,
  GuideApplicationStatus.SUSPENDED,
];

function guideDecisionsFor(status: GuideApplicationStatus) {
  if (status === GuideApplicationStatus.APPROVED) {
    return [GuideApplicationStatus.APPROVED, GuideApplicationStatus.SUSPENDED];
  }
  if (status === GuideApplicationStatus.SUSPENDED) {
    return [
      GuideApplicationStatus.SUSPENDED,
      GuideApplicationStatus.APPROVED,
      GuideApplicationStatus.CHANGES_REQUESTED,
    ];
  }
  return applicationDecisions;
}

function experienceDecisionsFor(status: GuideApplicationStatus) {
  if (status === GuideApplicationStatus.APPROVED) {
    return [GuideApplicationStatus.APPROVED, GuideApplicationStatus.SUSPENDED];
  }
  if (status === GuideApplicationStatus.SUSPENDED) {
    return [
      GuideApplicationStatus.SUSPENDED,
      GuideApplicationStatus.APPROVED,
      GuideApplicationStatus.CHANGES_REQUESTED,
      GuideApplicationStatus.REJECTED,
    ];
  }
  return experienceDecisions;
}

function decisionLabel(status: GuideApplicationStatus) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function ReviewControls({
  path,
  initialStatus,
  decisions,
  onSaved,
}: {
  path: string;
  initialStatus: GuideApplicationStatus;
  decisions: GuideApplicationStatus[];
  onSaved: (status: GuideApplicationStatus) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review could not be saved.");
      setMessage("Review decision saved.");
      onSaved(status);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded-xl bg-secondary/40 p-3">
      <label className="grid gap-1.5 text-xs font-semibold">
        Review status
        <Select onChange={(event) => setStatus(event.target.value as GuideApplicationStatus)} value={status}>
          {decisions.map((decision) => <option key={decision} value={decision}>{decisionLabel(decision)}</option>)}
        </Select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold">
        Note for the applicant
        <Textarea onChange={(event) => setNotes(event.target.value)} rows={2} value={notes} />
      </label>
      <Button disabled={busy} onClick={() => void save()} type="button" variant="outline">
        {busy ? "Saving…" : "Save review decision"}
      </Button>
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      {message ? <p className="text-xs text-muted-foreground" role="status">{message}</p> : null}
    </div>
  );
}

export function AdminGuideReview() {
  const router = useRouter();
  const [queues, setQueues] = useState<ReviewQueues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/guide-applications", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Review queue could not be loaded.");
        if (active) setQueues(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Review queue could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  function refreshAfterReview() {
    router.refresh();
    void fetch("/api/admin/guide-applications", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Review queue could not be refreshed.");
        setQueues(result);
      })
      .catch((refreshError: unknown) => {
        setError(refreshError instanceof Error ? refreshError.message : "Review queue could not be refreshed.");
      });
  }

  return (
    <section aria-label="Guide and experience verification" className="mt-8 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold">Guide &amp; experience review</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Approval is recorded separately for each guide and experience. Only approved guides with individually approved, published experiences can receive bookings.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
      {!queues && !error ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading review queues…</p> : null}

      <div className="mt-5 grid gap-6">
        <div>
          <h3 className="font-semibold">Guide applications ({queues?.applications.length ?? 0})</h3>
          {queues?.applications.length ? (
            <ul className="mt-3 grid gap-4 lg:grid-cols-2">
              {queues.applications.map((application) => (
                <li className="rounded-xl border border-border/60 p-4" key={application.id}>
                  <p className="font-semibold">{application.fullName} · {decisionLabel(application.status)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{application.email} · {application.phone}</p>
                  {application.applicant.guideProfile?.profilePhoto ? (
                    <Avatar className="mt-3 size-20 rounded-xl">
                      <AvatarImage alt={`${application.fullName} profile`} className="object-cover" src={application.applicant.guideProfile.profilePhoto} />
                      <AvatarFallback>{application.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : <p className="mt-2 text-xs text-muted-foreground">Profile photo missing.</p>}
                  <p className="mt-3 whitespace-pre-wrap text-sm">{application.biography}</p>
                  <dl className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <div><dt className="inline font-semibold">Proposed experience: </dt><dd className="inline">{application.serviceTitle || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Duration: </dt><dd className="inline">{application.serviceDurationMinutes ? `${application.serviceDurationMinutes} minutes` : "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Meeting point: </dt><dd className="inline">{application.serviceMeetingPoint || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Cancellation policy: </dt><dd className="inline">{application.serviceCancellationPolicy || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Group size: </dt><dd className="inline">{application.serviceMinGuests ?? "?"}–{application.serviceMaxGuests ?? "?"}</dd></div>
                    <div><dt className="inline font-semibold">Price: </dt><dd className="inline">{application.servicePrice ? formatCurrency(Number(application.servicePrice), application.serviceCurrency || "ZAR") : "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Languages: </dt><dd className="inline">{application.languages.join(", ") || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Provinces: </dt><dd className="inline">{application.operatingAreas.join(", ") || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Qualifications: </dt><dd className="inline">{application.qualifications.join(", ") || "Not provided"}</dd></div>
                    <div><dt className="inline font-semibold">Interests: </dt><dd className="inline">{application.specialties.join(", ") || "Not provided"}</dd></div>
                  </dl>
                  {application.serviceDescription ? <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{application.serviceDescription}</p> : null}
                  <div className="mt-3">
                    <p className="text-xs font-semibold">Protected documents</p>
                    {application.documents.length ? (
                      <ul className="mt-1 grid gap-1">
                        {application.documents.map((document) => (
                          <li className="flex justify-between gap-2 text-xs" key={document.id}>
                            <span>{document.documentType.replaceAll("_", " ")} · {document.originalFilename}</span>
                            <a className="shrink-0 text-primary underline" href={`/api/guide/onboarding/documents/${document.id}`}>Download</a>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1 text-xs text-muted-foreground">No documents uploaded.</p>}
                  </div>
                  <ReviewControls
                    decisions={guideDecisionsFor(application.status)}
                    initialStatus={application.status === GuideApplicationStatus.SUBMITTED || application.status === GuideApplicationStatus.PENDING ? GuideApplicationStatus.UNDER_REVIEW : application.status}
                    onSaved={refreshAfterReview}
                    path={`/api/admin/guide-applications/${application.id}`}
                  />
                </li>
              ))}
            </ul>
          ) : queues ? <p className="mt-2 text-sm text-muted-foreground">No guide applications are awaiting review.</p> : null}
        </div>

        <div>
          <h3 className="font-semibold">Experience listings ({queues?.experiences.length ?? 0})</h3>
          {queues?.experiences.length ? (
            <ul className="mt-3 grid gap-4 lg:grid-cols-2">
              {queues.experiences.map((experience) => (
                <li className="rounded-xl border border-border/60 p-4" key={experience.id}>
                  <p className="font-semibold">{experience.title} · {decisionLabel(experience.verificationStatus)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {experience.guide.user.name} · guide status {decisionLabel(experience.guide.verificationStatus)}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{experience.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {experience.category.name} · {experience.destination.name}, {experience.destination.city.province.name}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {experience.durationMinutes} minutes · {experience.meetingPoint || "Meeting point unavailable"} · {experience.minGuests}–{experience.maxGuests} guests · {formatCurrency(Number(experience.price), experience.currency)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Includes: {experience.inclusions.join(", ") || "Not provided"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Excludes: {experience.exclusions.join(", ") || "Not provided"}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">Cancellation policy: {experience.cancellationPolicy || "Not provided"}</p>
                  <ReviewControls
                    decisions={experienceDecisionsFor(experience.verificationStatus)}
                    initialStatus={experience.verificationStatus}
                    onSaved={refreshAfterReview}
                    path={`/api/admin/experiences/${experience.id}/verification`}
                  />
                </li>
              ))}
            </ul>
          ) : queues ? <p className="mt-2 text-sm text-muted-foreground">No experience listings are awaiting review.</p> : null}
        </div>
      </div>
    </section>
  );
}
