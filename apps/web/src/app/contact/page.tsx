import type { Metadata } from "next";
import { BRAND_NAME } from "@app/types";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export const metadata: Metadata = {
  title: `Contact — ${BRAND_NAME}`,
  description:
    "Contact the FaceLens team for Enterprise workspaces, privacy inquiries, or consent removal support.",
};

export default function ContactPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">Contact {BRAND_NAME}</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          Reach out for Enterprise deployment details, security documentation, or privacy and
          deletion support.
        </p>
      </section>

      <section className="py-12">
        <ContactForm />
      </section>
    </MarketingLayout>
  );
}
