"use client";

import { useEffect, useState } from "react";
import { GuideApplicationStatus, GuideDocumentType } from "@/src/server/db/generated/enums";
import {
  experienceVerificationStatusDescription,
  guideApplicationStatusDescription,
  guideApplicationStatusLabel,
} from "@/src/features/auth/guide-application-status";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

type DocumentRecord = {
  id: string;
  documentType: GuideDocumentType;
  originalFilename: string;
  sizeBytes: number;
  createdAt: string;
};

type OnboardingData = {
  status: GuideApplicationStatus;
  phone: string;
  biography: string;
  yearsExperience: number;
  languages: string[];
  operatingAreas: string[];
  qualifications: string[];
  specialties: string[];
  bankName: string | null;
  bankAccountHolder: string | null;
  bankBranchCode: string | null;
  bankAccountType: string | null;
  hasBankAccountNumber: boolean;
  permitsRequired: boolean;
  serviceTitle: string | null;
  serviceDescription: string | null;
  serviceCategoryId: string | null;
  serviceDestinationId: string | null;
  serviceCancellationPolicy: string | null;
  serviceDurationMinutes: number | null;
  serviceMeetingPoint: string | null;
  serviceMinGuests: number | null;
  serviceMaxGuests: number | null;
  serviceInclusions: string[];
  serviceExclusions: string[];
  servicePrice: string;
  adminNotes: string | null;
  profilePhoto: string | null;
  proposedExperience: {
    status: string;
    verificationStatus: GuideApplicationStatus;
  } | null;
  options: {
    categories: Array<{ id: string; name: string }>;
    destinations: Array<{ id: string; name: string; province: string }>;
  };
  documents: DocumentRecord[];
};

type FormValues = {
  phone: string;
  biography: string;
  yearsExperience: string;
  languages: string;
  operatingAreas: string;
  qualifications: string;
  specialties: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankAccountType: string;
  permitsRequired: boolean;
  serviceTitle: string;
  serviceDescription: string;
  serviceCategoryId: string;
  serviceDestinationId: string;
  serviceCancellationPolicy: string;
  serviceDurationMinutes: string;
  serviceMeetingPoint: string;
  serviceMinGuests: string;
  serviceMaxGuests: string;
  serviceInclusions: string;
  serviceExclusions: string;
  servicePrice: string;
};

const emptyValues: FormValues = {
  phone: "",
  biography: "",
  yearsExperience: "0",
  languages: "",
  operatingAreas: "",
  qualifications: "",
  specialties: "",
  bankName: "",
  bankAccountHolder: "",
  bankAccountNumber: "",
  bankBranchCode: "",
  bankAccountType: "",
  permitsRequired: false,
  serviceTitle: "",
  serviceDescription: "",
  serviceCategoryId: "",
  serviceDestinationId: "",
  serviceCancellationPolicy: "",
  serviceDurationMinutes: "",
  serviceMeetingPoint: "",
  serviceMinGuests: "",
  serviceMaxGuests: "",
  serviceInclusions: "",
  serviceExclusions: "",
  servicePrice: "",
};

const documentTypes: Array<{ value: GuideDocumentType; label: string }> = [
  { value: GuideDocumentType.GOVERNMENT_ID, label: "Identity document" },
  { value: GuideDocumentType.GUIDE_REGISTRATION, label: "Guide registration" },
  { value: GuideDocumentType.PERMIT, label: "Permit" },
  { value: GuideDocumentType.SUPPORTING_DOCUMENT, label: "Supporting certificate" },
  { value: GuideDocumentType.BANKING_VERIFICATION, label: "Banking verification (optional)" },
];

function listToText(items: string[]) {
  return items.join(", ");
}

function textToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toFormValues(data: OnboardingData): FormValues {
  return {
    phone: data.phone,
    biography: data.biography,
    yearsExperience: String(data.yearsExperience),
    languages: listToText(data.languages),
    operatingAreas: listToText(data.operatingAreas),
    qualifications: listToText(data.qualifications),
    specialties: listToText(data.specialties),
    bankName: data.bankName ?? "",
    bankAccountHolder: data.bankAccountHolder ?? "",
    bankAccountNumber: "",
    bankBranchCode: data.bankBranchCode ?? "",
    bankAccountType: data.bankAccountType ?? "",
    permitsRequired: data.permitsRequired,
    serviceTitle: data.serviceTitle ?? "",
    serviceDescription: data.serviceDescription ?? "",
    serviceCategoryId: data.serviceCategoryId ?? "",
    serviceDestinationId: data.serviceDestinationId ?? "",
    serviceCancellationPolicy: data.serviceCancellationPolicy ?? "",
    serviceDurationMinutes: data.serviceDurationMinutes ? String(data.serviceDurationMinutes) : "",
    serviceMeetingPoint: data.serviceMeetingPoint ?? "",
    serviceMinGuests: data.serviceMinGuests ? String(data.serviceMinGuests) : "",
    serviceMaxGuests: data.serviceMaxGuests ? String(data.serviceMaxGuests) : "",
    serviceInclusions: listToText(data.serviceInclusions),
    serviceExclusions: listToText(data.serviceExclusions),
    servicePrice: data.servicePrice,
  };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function GuideOnboardingForm({ status: initialStatus }: { status: GuideApplicationStatus }) {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [documentType, setDocumentType] = useState<GuideDocumentType>(GuideDocumentType.GOVERNMENT_ID);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const status = onboarding?.status ?? initialStatus;
  const editableStatuses: GuideApplicationStatus[] = [
    GuideApplicationStatus.DRAFT,
    GuideApplicationStatus.PENDING,
    GuideApplicationStatus.CHANGES_REQUESTED,
  ];
  const editable = editableStatuses.includes(status);

  useEffect(() => {
    let active = true;
    void fetch("/api/guide/onboarding", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Onboarding could not be loaded.");
        if (active) {
          setOnboarding(result.onboarding);
          setValues(toFormValues(result.onboarding));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Onboarding could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function uploadProfilePhoto() {
    if (!profileFile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("purpose", "profile-avatar");
      body.set("file", profileFile);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profile photo could not be uploaded.");
      setOnboarding((current) => current ? { ...current, profilePhoto: result.image.url } : current);
      setProfileFile(null);
      setMessage("Profile photo saved.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Profile photo could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument() {
    if (!documentFile) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("documentType", documentType);
      body.set("file", documentFile);
      const response = await fetch("/api/guide/onboarding/documents", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Document could not be uploaded.");
      setOnboarding((current) => current
        ? { ...current, documents: [result.document, ...current.documents] }
        : current);
      setDocumentFile(null);
      setMessage("Document uploaded and encrypted for storage.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Document could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function save(action: "save_draft" | "submit") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/guide/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          phone: values.phone,
          biography: values.biography,
          yearsExperience: Number(values.yearsExperience || 0),
          languages: textToList(values.languages),
          operatingAreas: textToList(values.operatingAreas),
          qualifications: textToList(values.qualifications),
          specialties: textToList(values.specialties),
          bankName: values.bankName,
          bankAccountHolder: values.bankAccountHolder,
          bankAccountNumber: values.bankAccountNumber,
          bankBranchCode: values.bankBranchCode,
          bankAccountType: values.bankAccountType,
          permitsRequired: values.permitsRequired,
          serviceTitle: values.serviceTitle,
          serviceDescription: values.serviceDescription,
          serviceCategoryId: values.serviceCategoryId,
          serviceDestinationId: values.serviceDestinationId,
          serviceCancellationPolicy: values.serviceCancellationPolicy,
          serviceDurationMinutes: Number(values.serviceDurationMinutes || 0),
          serviceMeetingPoint: values.serviceMeetingPoint,
          serviceMinGuests: Number(values.serviceMinGuests || 0),
          serviceMaxGuests: Number(values.serviceMaxGuests || 0),
          serviceInclusions: textToList(values.serviceInclusions),
          serviceExclusions: textToList(values.serviceExclusions),
          servicePrice: values.servicePrice,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Onboarding could not be saved.");
      setValues((current) => ({ ...current, bankAccountNumber: "" }));
      setMessage(result.message);
      if (result.application?.status) {
        setOnboarding((current) => current
          ? {
              ...current,
              status: result.application.status,
              hasBankAccountNumber: current.hasBankAccountNumber || Boolean(values.bankAccountNumber.trim()),
              ...(action === "submit"
                ? {
                    proposedExperience: {
                      status: "DRAFT",
                      verificationStatus: GuideApplicationStatus.SUBMITTED,
                    },
                  }
                : {}),
            }
          : current);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Onboarding could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!onboarding && !error) {
    return <p className="mt-6 text-sm text-muted-foreground" role="status">Loading your saved onboarding…</p>;
  }

  const documentTypesPresent = new Set(onboarding?.documents.map(({ documentType }) => documentType) ?? []);
  const incompleteItems = [
    !onboarding?.profilePhoto && "Profile photo",
    values.biography.trim().length < 40 && "Biography (at least 40 characters)",
    !textToList(values.languages).length && "At least one language",
    !textToList(values.operatingAreas).length && "At least one province served",
    !textToList(values.qualifications).length && "At least one qualification",
    !textToList(values.specialties).length && "At least one special interest",
    !values.bankName.trim() || !values.bankAccountHolder.trim() || !values.bankBranchCode.trim() ||
    !values.bankAccountType.trim() ||
      (!onboarding?.hasBankAccountNumber && !values.bankAccountNumber.trim())
      ? "Complete banking details"
      : null,
    !documentTypesPresent.has(GuideDocumentType.GOVERNMENT_ID) && "Identity document",
    !documentTypesPresent.has(GuideDocumentType.GUIDE_REGISTRATION) && "Guide registration",
    !documentTypesPresent.has(GuideDocumentType.SUPPORTING_DOCUMENT) && "Supporting certificate",
    values.permitsRequired && !documentTypesPresent.has(GuideDocumentType.PERMIT) ? "Relevant permit" : null,
    values.serviceTitle.trim().length < 3 && "Experience title",
    values.serviceDescription.trim().length < 40 && "Experience description (at least 40 characters)",
    !values.serviceCategoryId && "Experience category",
    !values.serviceDestinationId && "Experience destination",
    values.serviceCancellationPolicy.trim().length < 10 && "Cancellation policy",
    !Number(values.serviceDurationMinutes) && "Experience duration",
    !values.serviceMeetingPoint.trim() && "Meeting point",
    !Number(values.serviceMinGuests) || !Number(values.serviceMaxGuests) ||
      Number(values.serviceMaxGuests) < Number(values.serviceMinGuests)
      ? "Valid minimum and maximum group sizes"
      : null,
    !textToList(values.serviceInclusions).length && "Experience inclusions",
    !textToList(values.serviceExclusions).length && "Experience exclusions",
    !values.servicePrice || Number(values.servicePrice) <= 0 ? "Positive experience price" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="mt-8 grid gap-5">
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Application status</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {guideApplicationStatusDescription(status)}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
            {guideApplicationStatusLabel(status)}
          </span>
          {onboarding?.adminNotes ? (
            <p className="w-full rounded-xl border border-border/60 bg-secondary/40 p-3 text-sm">
              Nomsa team note: {onboarding.adminNotes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <SectionCard title="Step 1 — Profile details">
        <Field label="Profile photo">
          {onboarding?.profilePhoto ? (
            <Avatar className="size-20 rounded-xl">
              <AvatarImage alt="Your saved guide profile" className="object-cover" src={onboarding.profilePhoto} />
              <AvatarFallback>Guide</AvatarFallback>
            </Avatar>
          ) : <span className="text-xs text-muted-foreground">No profile photo saved.</span>}
          <Input accept="image/jpeg,image/png,image/webp" disabled={!editable || busy} onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} type="file" />
          <Button disabled={!editable || busy || !profileFile} onClick={uploadProfilePhoto} type="button" variant="outline">
            Upload profile photo
          </Button>
        </Field>
        <Field label="Phone">
          <Input autoComplete="tel" disabled={!editable} onChange={(event) => update("phone", event.target.value)} value={values.phone} />
        </Field>
        <Field label="Biography" hint="At least 40 characters are required before submission.">
          <Textarea disabled={!editable} onChange={(event) => update("biography", event.target.value)} rows={4} value={values.biography} />
        </Field>
        <Field label="Years of guiding experience">
          <Input disabled={!editable} max="80" min="0" onChange={(event) => update("yearsExperience", event.target.value)} type="number" value={values.yearsExperience} />
        </Field>
        <Field label="Languages" hint="Separate items with commas.">
          <Input disabled={!editable} onChange={(event) => update("languages", event.target.value)} value={values.languages} />
        </Field>
        <Field label="Provinces served" hint="Separate items with commas.">
          <Input disabled={!editable} onChange={(event) => update("operatingAreas", event.target.value)} value={values.operatingAreas} />
        </Field>
        <Field label="Qualifications" hint="Separate qualifications with commas.">
          <Textarea disabled={!editable} onChange={(event) => update("qualifications", event.target.value)} rows={2} value={values.qualifications} />
        </Field>
        <Field label="Special interests" hint="Separate interests with commas.">
          <Input disabled={!editable} onChange={(event) => update("specialties", event.target.value)} value={values.specialties} />
        </Field>
      </SectionCard>

      <SectionCard title="Step 2 — Required documents and banking details">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Documents are encrypted before they are stored in the application database. Only you and authorized administrators can download them. Accepted formats: PDF, JPEG, PNG; maximum 10 MB each.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Document type">
            <Select disabled={!editable} onChange={(event) => setDocumentType(event.target.value as GuideDocumentType)} value={documentType}>
              {documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="Choose a document">
            <Input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={!editable || busy} onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} type="file" />
          </Field>
          <Button disabled={!editable || busy || !documentFile} onClick={uploadDocument} type="button" variant="outline">
            Upload document
          </Button>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {onboarding?.documents.map((document) => (
            <li className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3 text-xs" key={document.id}>
              <span className="min-w-0">
                <span className="block font-semibold">{documentTypes.find(({ value }) => value === document.documentType)?.label ?? "Supporting document"}</span>
                <span className="block truncate text-muted-foreground">{document.originalFilename}</span>
              </span>
              <a className="shrink-0 font-semibold text-primary underline" href={`/api/guide/onboarding/documents/${document.id}`}>Download</a>
            </li>
          ))}
        </ul>
        {!onboarding?.documents.length ? <p className="text-xs text-muted-foreground">No documents have been uploaded.</p> : null}
        <Field label="Bank name"><Input disabled={!editable} onChange={(event) => update("bankName", event.target.value)} value={values.bankName} /></Field>
        <Field label="Account holder"><Input disabled={!editable} onChange={(event) => update("bankAccountHolder", event.target.value)} value={values.bankAccountHolder} /></Field>
        <Field label="Account number" hint={onboarding?.hasBankAccountNumber ? "A bank account number is already stored encrypted. Leave blank to keep it unchanged." : "Stored encrypted; it is never returned to the browser after saving."}>
          <Input autoComplete="off" disabled={!editable} onChange={(event) => update("bankAccountNumber", event.target.value)} value={values.bankAccountNumber} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch code"><Input disabled={!editable} onChange={(event) => update("bankBranchCode", event.target.value)} value={values.bankBranchCode} /></Field>
          <Field label="Account type"><Input disabled={!editable} onChange={(event) => update("bankAccountType", event.target.value)} value={values.bankAccountType} /></Field>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input checked={values.permitsRequired} disabled={!editable} onChange={(event) => update("permitsRequired", event.target.checked)} type="checkbox" />
          A permit is required for the services I plan to offer.
        </label>
      </SectionCard>

      <SectionCard title="Step 3 — Proposed experience">
        <p className="text-sm leading-relaxed text-muted-foreground">
          This is a proposed listing for review, not a published or bookable experience.
        </p>
        <Field label="Experience title"><Input disabled={!editable} onChange={(event) => update("serviceTitle", event.target.value)} value={values.serviceTitle} /></Field>
        <Field label="Description" hint="At least 40 characters are required before submission.">
          <Textarea disabled={!editable} onChange={(event) => update("serviceDescription", event.target.value)} rows={5} value={values.serviceDescription} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select disabled={!editable} onChange={(event) => update("serviceCategoryId", event.target.value)} value={values.serviceCategoryId}>
              <option value="">Choose a category</option>
              {onboarding?.options.categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Destination">
            <Select disabled={!editable} onChange={(event) => update("serviceDestinationId", event.target.value)} value={values.serviceDestinationId}>
              <option value="">Choose a destination</option>
              {onboarding?.options.destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name} · {destination.province}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)"><Input disabled={!editable} min="1" onChange={(event) => update("serviceDurationMinutes", event.target.value)} type="number" value={values.serviceDurationMinutes} /></Field>
          <Field label="Price (ZAR)"><Input disabled={!editable} min="0.01" onChange={(event) => update("servicePrice", event.target.value)} step="0.01" type="number" value={values.servicePrice} /></Field>
        </div>
        <Field label="Meeting point"><Input disabled={!editable} onChange={(event) => update("serviceMeetingPoint", event.target.value)} value={values.serviceMeetingPoint} /></Field>
        <Field label="Cancellation policy" hint="This policy is submitted for review and will be shown to customers if the experience is approved.">
          <Textarea disabled={!editable} onChange={(event) => update("serviceCancellationPolicy", event.target.value)} rows={3} value={values.serviceCancellationPolicy} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum group size"><Input disabled={!editable} max="10" min="1" onChange={(event) => update("serviceMinGuests", event.target.value)} type="number" value={values.serviceMinGuests} /></Field>
          <Field label="Maximum group size"><Input disabled={!editable} max="10" min="1" onChange={(event) => update("serviceMaxGuests", event.target.value)} type="number" value={values.serviceMaxGuests} /></Field>
        </div>
        <Field label="Inclusions" hint="Separate items with commas.">
          <Textarea disabled={!editable} onChange={(event) => update("serviceInclusions", event.target.value)} rows={2} value={values.serviceInclusions} />
        </Field>
        <Field label="Exclusions" hint="Separate items with commas.">
          <Textarea disabled={!editable} onChange={(event) => update("serviceExclusions", event.target.value)} rows={2} value={values.serviceExclusions} />
        </Field>
      </SectionCard>

      <SectionCard title="Step 4 — Approval status">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The Nomsa team reviews guide applications and experiences separately. Submitting does not publish either one. Only experiences explicitly approved and published with an approved guide can be booked.
        </p>
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Experience review status</p>
          {onboarding?.proposedExperience ? (
            <>
              <p className="mt-2 text-sm font-semibold">
                {guideApplicationStatusLabel(onboarding.proposedExperience.verificationStatus)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {experienceVerificationStatusDescription(onboarding.proposedExperience.verificationStatus)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No proposed listing has been submitted for review.</p>
          )}
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
        {editable ? (
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
            <h3 className="text-sm font-semibold">Items remaining before submission ({incompleteItems.length})</h3>
            {incompleteItems.length ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                {incompleteItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">All required details are present. Your documents and listing still require team review.</p>
            )}
          </div>
        ) : null}
        {editable ? (
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => void save("save_draft")} type="button" variant="outline">
              {busy ? "Saving…" : "Save draft"}
            </Button>
            <Button disabled={busy} onClick={() => void save("submit")} type="button">
              {busy ? "Saving…" : "Submit for review"}
            </Button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
