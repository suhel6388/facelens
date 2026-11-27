import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND_NAME } from "@app/types";
import { Button, StatusBadge } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  FeatureCardsSection,
  HowItWorksSection,
  PricingCardsSection,
  TrustPrivacySummary,
} from "@/components/marketing/marketing-sections";
import { UploadPreview } from "@/components/marketing/upload-preview";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Compare Images Across Private Collections`,
  description:
    "Consent-first visual similarity search across explicitly authorized private image collections.",
};

export default function HomePage() {
  return (
    <MarketingLayout>
      <section className="py-14 text-center lg:py-20" aria-labelledby="hero-heading">
        <div className="mb-6 flex justify-center">
          <StatusBadge status="completed" label="Consent-First Private Search" />
        </div>
        <h1 id="hero-heading" className="type-display mx-auto max-w-4xl text-white">
          Compare images across your private collections.
        </h1>
        <p className="type-body mx-auto mt-5 max-w-2xl text-muted">
          {BRAND_NAME} enables authorized teams to compare a submitted image against explicitly
          enrolled private collections. Results are visual similarity estimates for human
          review—never identity verification or public-web search.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="primary" size="lg" asChild>
            <Link href="/dashboard">
              <span>Start a comparison</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>

        <UploadPreview />
      </section>

      <HowItWorksSection />
      <FeatureCardsSection />
      <TrustPrivacySummary />
      <PricingCardsSection />
    </MarketingLayout>
  );
}
