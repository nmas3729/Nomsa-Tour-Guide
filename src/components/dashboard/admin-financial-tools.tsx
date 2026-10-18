"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { Button } from "@/src/components/ui/button";
import { CompleteBookingAction } from "@/src/components/booking/complete-booking-action";

type PaymentCase = {
  id: string;
  status: string;
  paymentStatus: string;
  totalPrice: string;
  currency: string;
  experience: { title: string };
  payments: Array<{
    amount: string;
    refundedAmount: string;
  }>;
};

type PayoutRecord = {
  id: string;
  amount: string;
  grossAmount: string | null;
  commissionAmount: string | null;
  commissionRate: string | null;
  currency: string;
  eligibleAt: string | null;
  canRelease: boolean;
  booking: {
    status: string;
    paymentStatus: string;
    serviceCompletedAt: string | null;
    experience: { title: string };
  };
};

type ServiceCompletionRecord = {
  id: string;
  canMarkComplete: boolean;
  status: string;
  experienceDate: Date | string;
  experience: { title: string };
};

function PaymentCaseForm({ paymentCase }: { paymentCase: PaymentCase }) {
  const router = useRouter();
  const payment = paymentCase.payments[0];
  const [status, setStatus] = useState(paymentCase.paymentStatus);
  const [refundedAmount, setRefundedAmount] = useState(payment?.refundedAmount.toString() ?? "0");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function update() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/bookings/${paymentCase.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, refundedAmount }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Payment update could not be recorded.");
        return;
      }
      setMessage("Payment record updated.");
      router.refresh();
    } catch {
      setMessage("Payment update could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-border/60 bg-card p-4">
      <p className="font-semibold">{paymentCase.experience.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Booking: {paymentCase.status.replaceAll("_", " ")} · Payment: {paymentCase.paymentStatus.replaceAll("_", " ")} · Captured:{" "}
        {payment ? formatCurrency(Number(payment.amount), paymentCase.currency) : "Unavailable"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium">
          Payment status
          <select
            className="ui-select mt-1"
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatus(nextStatus);
              if (nextStatus === "REFUNDED" && payment) {
                setRefundedAmount(payment.amount.toString());
              } else if (nextStatus === "SUCCEEDED") {
                setRefundedAmount("0");
              }
            }}
            value={status}
          >
            <option value="SUCCEEDED">Paid</option>
            <option value="PARTIALLY_REFUNDED">Partially refunded</option>
            <option value="REFUND_PENDING">Refund pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </label>
        <label className="text-xs font-medium">
          Total refund amount (ZAR)
          <input
            className="ui-input mt-1"
            inputMode="decimal"
            min="0"
            onChange={(event) => setRefundedAmount(event.target.value)}
            step="0.01"
            type="number"
            value={refundedAmount}
          />
        </label>
        <Button disabled={saving || !payment} onClick={update} type="button" variant="outline">
          {saving ? "Saving…" : "Record update"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Refund amount is the cumulative amount already refunded, not a new transaction amount.
      </p>
      {message ? <p className="mt-2 text-xs text-muted-foreground" role="status">{message}</p> : null}
    </li>
  );
}

function PayoutReleaseForm({ payout }: { payout: PayoutRecord }) {
  const router = useRouter();
  const [eftReference, setEftReference] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const canRelease =
    payout.booking.status === "COMPLETED" &&
    Boolean(payout.booking.serviceCompletedAt) &&
    ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payout.booking.paymentStatus) &&
    payout.canRelease;

  async function recordPaid() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/payouts/${payout.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eftReference }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Payout could not be recorded.");
        return;
      }
      setMessage("Transfer recorded as paid.");
      router.refresh();
    } catch {
      setMessage("Payout could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-border/60 bg-card p-4">
      <p className="font-semibold">{payout.booking.experience.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Pending payout · {formatCurrency(Number(payout.amount), payout.currency)} · eligible{" "}
        {payout.eligibleAt ? formatDate(payout.eligibleAt) : "date unavailable"} ·{" "}
        payment {payout.booking.paymentStatus.replaceAll("_", " ").toLowerCase()}
      </p>
      {payout.grossAmount && payout.commissionAmount ? (
        <p className="mt-1 text-xs text-muted-foreground">
          After refunds {formatCurrency(Number(payout.grossAmount), payout.currency)} ·{" "}
          {payout.commissionRate
            ? `${new Intl.NumberFormat("en-ZA", { style: "percent", maximumFractionDigits: 2 }).format(Number(payout.commissionRate))} commission`
            : "Commission rate unavailable"}{" "}
          {formatCurrency(Number(payout.commissionAmount), payout.currency)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Commission breakdown unavailable; manual reconciliation required.</p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-xs font-medium">
          Confirmed transfer reference
          <input
            className="ui-input mt-1"
            maxLength={80}
            onChange={(event) => setEftReference(event.target.value)}
            value={eftReference}
          />
        </label>
        <Button
          disabled={saving || !canRelease || eftReference.trim().length < 3}
          onClick={recordPaid}
          type="button"
        >
          {saving ? "Recording…" : "Record transfer as paid"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground" role="status">{message}</p> : null}
    </li>
  );
}

export function AdminFinancialTools({
  payouts,
  paymentCases,
  serviceBookings,
}: {
  payouts: PayoutRecord[];
  paymentCases: PaymentCase[];
  serviceBookings: ServiceCompletionRecord[];
}) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <section className="dashboard-panel rounded-2xl border border-border/60 bg-card p-5 sm:p-6 lg:col-span-2">
        <h2 className="font-display text-xl font-semibold">Service completion queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Guide or admin must explicitly mark a service complete before payout eligibility can begin.
        </p>
        {serviceBookings.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {serviceBookings.map((booking) => (
              <li className="rounded-xl border border-border/60 bg-card p-4" key={booking.id}>
                <p className="font-semibold">{booking.experience.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(booking.experienceDate)} · {booking.status.replaceAll("_", " ")}
                </p>
                {booking.canMarkComplete ? (
                  <div className="mt-3"><CompleteBookingAction bookingId={booking.id} /></div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Scheduled end time has not passed.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No bookings are awaiting service completion.</p>
        )}
      </section>
      <section className="dashboard-panel rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Pending guide payouts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Record a payout only after the transfer is complete. Disputed or refunded payments remain blocked.
        </p>
        {payouts.length ? (
          <ul className="mt-4 grid gap-3">{payouts.map((payout) => <PayoutReleaseForm key={payout.id} payout={payout} />)}</ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No pending payout records.</p>
        )}
      </section>
      <section className="dashboard-panel rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Manual payment records</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Record verified refund or dispute outcomes. This control does not initiate payments or refunds.
        </p>
        {paymentCases.length ? (
          <ul className="mt-4 grid gap-3">{paymentCases.map((paymentCase) => <PaymentCaseForm key={paymentCase.id} paymentCase={paymentCase} />)}</ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No paid, partially refunded, or disputed booking records.</p>
        )}
      </section>
    </div>
  );
}
