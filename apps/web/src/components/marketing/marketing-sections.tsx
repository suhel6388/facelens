import Link from "next/link";
import {
  Check,
  Clock,
  FolderLock,
  Lock,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, StatusBadge } from "@app/ui";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Create an authorized private collection",
    description:
      "Define the collection purpose, confirm documented authority, and enroll images with explicit consent records.",
  },
  {
    step: "02",
    title: "Upload an image you are permitted to process",
    description:
      "Files are validated by MIME type, signature, dimensions, and size, then stored in private object storage.",
  },
  {
    step: "03",
    title: "Compare against the selected collection",
    description:
      "Background workers verify active consent and run similarity indexing strictly isolated to that collection.",
  },
  {
    step: "04",
    title: "Review candidate similarity results",
    description:
      "Inspect ranked candidate images with clear uncertainty wording, retention expiry, and one-click deletion.",
  },
] as const;

const FEATURES = [
  {
    title: "Private collections",
    description:
      "Tenant-isolated collections with documented purpose and zero cross-workspace or public-web access.",
    Icon: FolderLock,
    accent: "text-primary",
  },
  {
    title: "Secure uploads",
    description:
      "Server-side MIME and signature validation, EXIF stripping, and short-lived private signed URLs.",
    Icon: Lock,
    accent: "text-secondary",
  },
  {
    title: "Background processing",
    description:
      "Queue-backed job lifecycle with real-time status, bounded retries, cancellation, and consent rechecks.",
    Icon: Clock,
    accent: "text-primary",
  },
  {
    title: "Similarity ranking",
    description:
      "Candidate results ranked by visual similarity estimate—clearly labelled as estimates, never identity.",
    Icon: SlidersHorizontal,
    accent: "text-secondary",
  },
  {
    title: "Consent & deletion controls",
    description:
      "Immediate consent withdrawal propagation across stored files, derived embeddings, caches, and queued jobs.",
    Icon: ShieldAlert,
    accent: "text-warning",
  },
  {
    title: "Workspace permissions",
    description:
      "Role-based access control for owners, members, and viewers with auditable sensitive actions.",
    Icon: Users,
    accent: "text-success",
  },
] as const;

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "per month",
    description: "For evaluating authorized private collection workflows with synthetic or demo sets.",
    highlighted: false,
    limits: [
      "1 workspace, up to 2 members",
      "Up to 2 private collections",
      "500 enrolled images total",
      "100 comparisons per month",
      "14-day search history retention",
    ],
    ctaLabel: "Start with Starter",
    ctaHref: "/dashboard",
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per month",
    description: "For organizations managing multiple authorized collections and team review.",
    highlighted: true,
    limits: [
      "Up to 3 workspaces, 15 members",
      "Up to 25 private collections",
      "25,000 enrolled images total",
      "2,500 comparisons per month",
      "Configurable retention (7–90 days) & audit logs",
    ],
    ctaLabel: "Choose Team",
    ctaHref: "/dashboard",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual agreement",
    description: "For dedicated deployment, custom retention policies, and compliance review.",
    highlighted: false,
    limits: [
      "Unlimited workspaces & role policies",
      "Custom collection and image quotas",
      "Dedicated AI worker isolation",
      "Custom retention & deletion SLAs",
      "Security & privacy architecture review",
    ],
    ctaLabel: "Contact sales",
    ctaHref: "/contact",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="py-16" aria-labelledby="how-it-works-heading">
      <div className="mb-10 max-w-2xl">
        <h2 id="how-it-works-heading" className="type-page text-white">
          How it works
        </h2>
        <p className="type-body mt-2 text-muted">
          A transparent, four-step workflow designed around documented authorization and human review.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS_STEPS.map((item) => (
          <Card key={item.step}>
            <CardHeader>
              <span className="text-xs font-semibold tracking-wider text-secondary">
                STEP {item.step}
              </span>
              <CardTitle className="mt-1 text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function FeatureCardsSection() {
  return (
    <section className="py-16" aria-labelledby="features-heading">
      <div className="mb-10 max-w-2xl">
        <h2 id="features-heading" className="type-page text-white">
          Built for controlled private comparisons
        </h2>
        <p className="type-body mt-2 text-muted">
          Every layer—from upload validation to background indexing—enforces tenant isolation and
          consent controls.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.Icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <Icon className={`mb-2 h-5 w-5 ${feature.accent}`} aria-hidden="true" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function TrustPrivacySummary() {
  return (
    <section className="py-16" aria-labelledby="trust-privacy-heading">
      <Card className="bg-surface">
        <CardHeader>
          <div className="mb-2">
            <StatusBadge status="completed" label="Privacy & Governance" />
          </div>
          <CardTitle id="trust-privacy-heading" className="type-section">
            Clear boundaries on data, retention, and similarity scores
          </CardTitle>
          <CardDescription>
            FaceLens never searches the public internet, never crawls social media, and never
            claims that a similarity estimate establishes identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium text-white">What is stored</p>
            <p className="mt-1 text-xs leading-relaxed">
              Private object-storage keys, consent records, and workspace-isolated similarity
              indexes—never public profiles or scraped metadata.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium text-white">Consent &amp; deletion</p>
            <p className="mt-1 text-xs leading-relaxed">
              Withdrawing consent immediately disables future comparisons and removes original
              files, derived representations, and queued jobs.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
            <p className="font-medium text-white">Score limitations</p>
            <p className="mt-1 text-xs leading-relaxed">
              Similarity scores are visual estimates for human review and must not be used for
              employment, housing, credit, or law-enforcement decisions.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/privacy">Read full privacy notice</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/terms">Review terms of use</Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

export function PricingCardsSection() {
  return (
    <section className="py-16" aria-labelledby="pricing-heading">
      <div className="mb-10 max-w-2xl">
        <h2 id="pricing-heading" className="type-page text-white">
          Transparent plan limits
        </h2>
        <p className="type-body mt-2 text-muted">
          Choose the workspace capacity that fits your authorized collections and retention policy.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? "border-primary/60 bg-elevated/40" : undefined}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-white">{plan.price}</span>
                <span className="text-xs text-muted">{plan.cadence}</span>
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5 text-sm text-muted">
                {plan.limits.map((limit) => (
                  <li key={limit} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{limit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                className="w-full"
                asChild
              >
                <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

