import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContactForm, NewsletterForm } from "./marketing-forms";

describe("NewsletterForm", () => {
  it("does not imply that newsletter sign-up works before a subscription endpoint exists", () => {
    render(<NewsletterForm />);

    const email = screen.getByRole("textbox", { name: "Email address" });
    const submit = screen.getByRole("button", { name: "Coming soon" });
    expect(email).toBeDisabled();
    expect(email.getAttribute("aria-describedby")).toBe("newsletter-unavailable");
    expect(submit).toBeDisabled();
    expect(submit.getAttribute("aria-describedby")).toBe("newsletter-unavailable");
    expect(screen.getByText("Newsletter sign-up is not available yet.")).toBeInTheDocument();
  });
});

describe("ContactForm", () => {
  it("submits through its API and reports success without disabling the form permanently", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ContactForm />);

    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Taylor Guest" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "taylor@example.com" } });
    fireEvent.change(screen.getByLabelText("What can we help with?"), { target: { value: "Planning a journey" } });
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "I have a question." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Thanks for reaching out! Your message has been sent.");
    expect(fetchMock).toHaveBeenCalledWith("/api/contact", expect.objectContaining({ method: "POST" }));
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("reports API failure and keeps the entered message available to retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Contact service is unavailable." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactForm />);

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Taylor Guest" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "taylor@example.com" } });
    fireEvent.change(screen.getByLabelText("What can we help with?"), { target: { value: "Planning a journey" } });
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "I have a question." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Contact service is unavailable.");
    expect(screen.getByLabelText("Your message")).toHaveValue("I have a question.");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });
});
