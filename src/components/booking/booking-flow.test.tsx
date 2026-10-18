import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { detailedExperiences } from "@/src/data/experience-details";
import { BookingFlow } from "./booking-flow";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: "a" }));

const experience = detailedExperiences["bo-kaap-local-walk"];
if (!experience) {
  throw new Error("Expected booking-flow test experience data.");
}

function renderBookingFlow(
  initialDate = "2026-10-20",
  experienceData = experience,
) {
  return render(
    <BookingFlow
      experience={experienceData}
      initialDate={initialDate}
      initialGuestCount={2}
      minimumBookingDate="2026-10-18"
      searchQuery="date=2026-10-20&guests=2"
    />,
  );
}

describe("BookingFlow controls", () => {
  it("renders the booking flow when an approved experience has no uploaded images", () => {
    const { container } = renderBookingFlow("2026-10-20", { ...experience, images: [] });

    expect(screen.getByRole("heading", { name: "Choose Date & Departure" })).toBeInTheDocument();
    expect(screen.getByText(experience.title)).toBeInTheDocument();
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
  });

  it("keeps both Continue controls on the date step until a date is entered", () => {
    renderBookingFlow("");

    fireEvent.click(screen.getByRole("button", { name: "Continue to Traveller Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Choose Date & Departure" })).toBeInTheDocument();
    expect(screen.getByLabelText("Select Travel Date")).toBeInvalid();
  });

  it("requires valid traveller details before opening the reservation summary", () => {
    renderBookingFlow();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Traveller Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Booking Summary" }));
    expect(screen.getByRole("heading", { name: "Lead Traveller & Guests" })).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInvalid();

    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Taylor" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Guest" } });
    fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "taylor@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone Number (WhatsApp)"), { target: { value: "0712345678" } });
    fireEvent.change(screen.getByLabelText("Country of Residence"), { target: { value: "South Africa" } });
    fireEvent.change(screen.getByLabelText("Contact Full Name"), { target: { value: "Emergency Contact" } });
    fireEvent.change(screen.getByLabelText("Contact Phone"), { target: { value: "0723456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Review Booking Summary" }));

    expect(screen.getByRole("heading", { name: "Review Reservation" })).toBeInTheDocument();
  });

  it("exposes only actionable steps and lets travellers return to completed steps", () => {
    renderBookingFlow();

    const dateStep = screen.getByRole("button", { name: "Step 1: Date & Time" });
    const travellerStep = screen.getByRole("button", { name: "Step 2: Travellers" });
    expect(dateStep).toBeDisabled();
    expect(dateStep).toHaveAttribute("aria-current", "step");
    expect(travellerStep).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Continue to Traveller Details" }));
    expect(screen.getByRole("heading", { name: "Lead Traveller & Guests" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 1: Date & Time" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Step 2: Travellers" })).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: "Step 1: Date & Time" }));
    expect(screen.getByRole("heading", { name: "Choose Date & Departure" })).toBeInTheDocument();
  });

  it("uses 44px guest controls and updates the guest total", () => {
    renderBookingFlow();

    const increaseAdults = screen.getByRole("button", { name: "Increase adults" });
    expect(increaseAdults).toHaveClass("size-11");
    fireEvent.click(increaseAdults);

    expect(screen.getByText("Total (3 guests)")).toBeInTheDocument();
  });
});
