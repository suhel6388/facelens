import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { Button } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  FeatureCardsSection,
  TrustPrivacySummary,
} from "@/components/marketing/marketing-sections";

export const metadata: Metadata = {
  title: `Features — ${BRAND_NAME}`,
  description:
    "Explore private collections, server-side upload validation, background job processing, and consent controls.",
};

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">
          Purpose-built for private, authorized similarity search
        </h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          Every workflow in {BRAND_NAME} is designed around documented permission, tenant isolation,
          and transparent human review.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" asChild>
            <Link href="/dashboard">Start a comparison</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
      </section>

      <FeatureCardsSection />
      <TrustPrivacySummary />
    </MarketingLayout>
  );
}
