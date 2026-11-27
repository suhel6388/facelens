import Link from "next/link";
import { ArrowRight, FolderLock, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { BRAND_NAME } from "@app/types";
import { Button, Card, CardDescription, CardHeader, CardTitle, StatusBadge } from "@app/ui";
import { MarketingNavbar } from "@/components/layout/marketing-navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      <main className="mx-auto max-w-shell px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <section id="product" className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <StatusBadge status="completed" label="Consent-First Private Search" />
          </div>
          <h1 className="type-display text-white">
            Compare images across your private collections.
          </h1>
          <p className="type-body mx-auto mt-5 max-w-2xl text-muted">
            {BRAND_NAME} helps authorized teams compare a submitted image against explicitly
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
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="type-support mx-auto mt-5 max-w-xl">
            Privacy notice: Uploads stay private to your workspace and are never used to search the
            public internet or train external models.
          </p>
        </section>

        <section
          id="how-it-works"
          className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Core workflow"
        >
          <Card>
            <CardHeader>
              <FolderLock className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>1. Create an authorized collection</CardTitle>
              <CardDescription>
                Enroll images only with documented permission and explicit consent records.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <SlidersHorizontal className="mb-2 h-5 w-5 text-secondary" aria-hidden="true" />
              <CardTitle>2. Compare against your collection</CardTitle>
              <CardDescription>
                Submit a query image, confirm permitted purpose, and run isolated background
                matching.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <ShieldCheck className="mb-2 h-5 w-5 text-success" aria-hidden="true" />
              <CardTitle>3. Review &amp; retain full control</CardTitle>
              <CardDescription>
                Inspect candidate similarity estimates, withdraw consent anytime, or purge data.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
