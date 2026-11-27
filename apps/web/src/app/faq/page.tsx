import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export const metadata: Metadata = {
  title: `FAQ — ${BRAND_NAME}`,
  description:
    "Frequently asked questions about private collections, consent records, retention, and similarity estimates.",
};

const FAQS = [
  {
    q: "Does FaceLens search the public internet or social media?",
    a: "No. FaceLens only compares submitted images against private collections explicitly enrolled and authorized inside your workspace. It never crawls or indexes public websites or social networks.",
  },
  {
    q: "Does a similarity score confirm a person's identity?",
    a: "No. Similarity scores are visual similarity estimates intended solely to assist human review within an authorized collection. They are never proof of identity.",
  },
  {
    q: "What is required before enrolling an image in a collection?",
    a: "You must state the collection's permitted purpose, confirm documented authority to manage the collection, record the authorization basis for each image, and confirm no minors are depicted.",
  },
  {
    q: "What happens when consent is withdrawn or an image is deleted?",
    a: "The image is immediately disabled from future comparisons. Associated stored files, derived similarity representations, cached previews, and queued jobs are removed or invalidated according to retention policy.",
  },
  {
    q: "Can another workspace see my collections or searches?",
    a: "No. Collections, uploaded images, similarity indexes, and search results are strictly tenant-isolated and enforced server-side on every request and background job.",
  },
] as const;

export default function FaqPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">Frequently asked questions</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          Answers about {BRAND_NAME} privacy boundaries, consent workflows, and technical
          safeguards.
        </p>
      </section>

      <section className="py-12">
        <div className="grid gap-5">
          {FAQS.map((item) => (
            <Card key={item.q}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="type-body text-muted">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button variant="primary" asChild>
            <Link href="/contact">Contact support</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/privacy">Privacy policy</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
