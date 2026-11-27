import type { Metadata } from "next";
import { BRAND_NAME } from "@app/types";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import {
  PricingCardsSection,
  TrustPrivacySummary,
} from "@/components/marketing/marketing-sections";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description:
    "Clear plan limits and workspace capacities for authorized private collection similarity search.",
};

export default function PricingPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">Simple, predictable workspace plans</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          Every plan includes tenant-isolated collections, consent tracking, and full deletion
          controls.
        </p>
      </section>

      <PricingCardsSection />
      <TrustPrivacySummary />
    </MarketingLayout>
  );
}
