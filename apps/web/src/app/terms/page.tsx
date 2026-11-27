import type { Metadata } from "next";
import { BRAND_NAME } from "@app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export const metadata: Metadata = {
  title: `Terms and Conditions — ${BRAND_NAME}`,
  description:
    "Terms of use, authorized collection requirements, prohibited uses, and similarity score disclaimers for FaceLens.",
};

const TERMS_SECTIONS = [
  {
    title: "1. Authorized private collections only",
    body: "You may enroll or compare images only when you own the collection or hold documented permission and lawful basis to process those images within your workspace.",
  },
  {
    title: "2. Prohibited uses",
    body: "You must not use FaceLens for public-web surveillance, social media scraping, stalking, harassment, doxxing, processing images of minors, or making consequential eligibility decisions (employment, housing, credit, insurance, or law enforcement).",
  },
  {
    title: "3. No identity claims",
    body: "Similarity estimates returned by FaceLens do not establish identity, character, or wrongdoing. All candidate results require independent human review.",
  },
  {
    title: "4. Consent withdrawal and account termination",
    body: "You must honor consent withdrawal requests promptly using the workspace removal workflows. Accounts violating these terms or applicable privacy laws may be suspended or terminated.",
  },
] as const;

export default function TermsPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">Terms and Conditions</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          Governing authorized use of the {BRAND_NAME} private collection visual similarity
          platform.
        </p>
      </section>

      <section className="grid gap-5 py-12 md:grid-cols-2">
        {TERMS_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-body text-muted">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </MarketingLayout>
  );
}
