"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@app/ui";

export function ContactForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; email?: string; message?: string } = {};

    if (name.trim().length < 2) nextErrors.name = "Please enter your name.";
    if (!email.includes("@")) nextErrors.email = "Please enter a valid email address.";
    if (message.trim().length < 10)
      nextErrors.message = "Please provide at least 10 characters describing your inquiry.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitted(true);
    toast.success("Inquiry received", {
      description: "Thank you for contacting FaceLens. We will respond via email.",
    });
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Send us a message</CardTitle>
        <CardDescription>
          Questions about private collection governance, Enterprise plans, or consent removal
          workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-[#86EFAC]">
            Your message has been recorded for review. Do not include sensitive personal images in
            contact inquiries.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Full name"
              placeholder="Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
            />
            <Input
              label="Work email"
              type="email"
              placeholder="alex@organization.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-message" className="text-sm font-medium text-white">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your authorized collection use case..."
                aria-invalid={Boolean(errors.message) || undefined}
                className="w-full rounded-[9px] border border-[#252A35] bg-[#101218] px-3.5 py-2.5 text-sm text-white placeholder:text-[#9CA3AF]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6575FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090D]"
              />
              {errors.message ? (
                <p role="alert" className="text-xs text-[#FCA5A5]">
                  {errors.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" variant="primary">
              Send message
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
