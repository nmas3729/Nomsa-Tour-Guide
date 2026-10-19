"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

export function NewsletterForm() {
  return (
    <div className="grid gap-3">
      <Label className="sr-only" htmlFor="newsletter-email">Email address</Label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          autoComplete="email"
          className="h-12 rounded-full border-border/80 bg-background px-6 text-sm shadow-sm transition-all focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          aria-describedby="newsletter-unavailable"
          disabled
          id="newsletter-email"
          name="email"
          placeholder="Enter your email address"
          type="email"
        />
        <Button
          className="h-12 shrink-0 rounded-full bg-accent px-7 font-semibold text-accent-foreground shadow-md shadow-accent/20 hover:bg-accent/90"
          aria-describedby="newsletter-unavailable"
          disabled
          type="button"
        >
          <span>Coming soon</span>
          <ArrowRight aria-hidden="true" size={16} />
        </Button>
      </div>
      <p className="min-h-5 text-xs text-muted-foreground" id="newsletter-unavailable">
        Newsletter sign-up is not available yet.
      </p>
    </div>
  );
}

export function ContactForm() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Your message could not be sent. Please try again shortly.");
        return;
      }

      setMessage("Thanks for reaching out! Your message has been sent.");
      form.reset();
    } catch {
      setMessage("Your message could not be sent. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" method="post" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contact-name">Your name</Label>
          <Input autoComplete="name" id="contact-name" name="name" placeholder="How should we address you?" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-email">Email address</Label>
          <Input autoComplete="email" id="contact-email" name="email" placeholder="you@example.com" required type="email" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-subject">What can we help with?</Label>
        <select className="ui-select" defaultValue="" id="contact-subject" name="subject" required>
          <option disabled value="">Choose a topic</option>
          <option>Planning a journey</option>
          <option>Becoming a local guide</option>
          <option>Partnerships & Press</option>
          <option>General Concierge</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">Your message</Label>
        <Textarea className="min-h-36" id="contact-message" name="message" placeholder="Tell us about your upcoming plans..." required />
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button className="h-12 px-7" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send message"}
          {!isSubmitting ? <Send aria-hidden="true" size={16} /> : null}
        </Button>
        <p aria-live="polite" className="text-xs leading-5 text-muted-foreground" role="status">
          {message || "Your message will be sent to the Nomsa team."}
        </p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Read our <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy">Privacy Notice</Link> to learn how we handle your information.
      </p>
    </form>
  );
}
