import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { HowItWorksSection } from "@/components/marketing/marketing-sections";

export const metadata: Metadata = {
  title: `How It Works — ${BRAND_NAME}`,
  description:
    "Learn how FaceLens compares images strictly within authorized private collections and why similarity scores are estimates.",
};

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">How {BRAND_NAME} works</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          A four-step comparison workflow that verifies authorization before indexing and keeps
          every collection strictly isolated to its workspace.
        </p>
      </section>

      <HowItWorksSection />

      <section className="pb-16">
        <Card>
          <CardHeader>
            <CardTitle>Important limitations &amp; non-goals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted sm:grid-cols-2">
            <div>
              <p className="font-medium text-white">Not an identity-verification tool</p>
              <p className="mt-1 leading-relaxed">
                Similarity scores estimate visual likeness between a submitted image and candidate
                images in your collection. Human review is always required.
              </p>
            </div>
            <div>
              <p className="font-medium text-white">No public-web crawling</p>
              <p className="mt-1 leading-relaxed">
                {BRAND_NAME} never searches the public internet, social networks, or third-party
                websites, and prohibits processing minors or consequential eligibility decisions.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" asChild>
            <Link href="/dashboard">Start a comparison</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/faq">Read FAQ</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
