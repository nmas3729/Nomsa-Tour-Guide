"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

export function NewsletterForm() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Thank you! Newsletter sign-up preview received.");
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <Label className="sr-only" htmlFor="newsletter-email">Email address</Label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          autoComplete="email"
          className="h-12 rounded-full border-border/80 bg-background px-6 text-sm shadow-sm transition-all focus:border-primary"
          id="newsletter-email"
          name="email"
          placeholder="Enter your email address"
          required
          type="email"
        />
        <Button
          className="h-12 shrink-0 rounded-full bg-accent px-7 font-semibold text-white shadow-md shadow-accent/20 hover:bg-accent/90"
          type="submit"
        >
          <span>Join Nomsa</span>
          <ArrowRight aria-hidden="true" size={16} />
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {message || "Design preview only · Unsubscribe with a single click anytime."}
      </p>
    </form>
  );
}

export function ContactForm() {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Thanks for reaching out! Your message preview has been noted.");
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
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
        <Button className="h-12 px-7" type="submit">
          Send message
          <Send aria-hidden="true" size={16} />
        </Button>
        <p aria-live="polite" className="text-xs leading-5 text-muted-foreground">
          {message || "We usually respond within 24 hours (Monday – Friday)."}
        </p>
      </div>
    </form>
  );
}
