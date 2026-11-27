import type { Metadata } from "next";
import { BRAND_NAME } from "@app/types";
import { Card, CardContent, CardHeader, CardTitle } from "@app/ui";
import { MarketingLayout } from "@/components/marketing/marketing-layout";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description:
    "How FaceLens handles uploads, private storage, access isolation, retention, consent withdrawal, and deletion.",
};

const PRIVACY_SECTIONS = [
  {
    title: "1. What is uploaded",
    body: "You upload query images for comparison or collection images for enrollment into a private collection. Uploads are validated on the server by MIME type, file signature, size, and dimensions.",
  },
  {
    title: "2. What is stored",
    body: "Original files are stored in private, non-public object storage with randomized keys. PostgreSQL stores metadata, consent records, and audit logs. Derived similarity indexes are isolated per workspace and collection.",
  },
  {
    title: "3. Who can access it",
    body: "Only authenticated members of the owning workspace with appropriate role permissions can access a collection or its search results. Cross-tenant access is blocked server-side. Administrative support access is exceptional, permission-controlled, and audited.",
  },
  {
    title: "4. How long data is retained",
    body: "Workspaces configure retention windows (for example, 7 to 90 days for search history). Expired searches and associated query files are automatically purged according to policy.",
  },
  {
    title: "5. Consent withdrawal and deletion",
    body: "Authorized owners or data subjects can withdraw consent or request deletion at any time. Withdrawn images are disabled immediately from future comparisons, and original files, derived representations, cached previews, and queued jobs are removed.",
  },
  {
    title: "6. Why similarity does not establish identity",
    body: "Visual similarity scores are mathematical estimates comparing image features within a private collection. They do not verify identity, prove who appears in a photograph, or support consequential decisions.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border py-14">
        <h1 className="type-display max-w-3xl text-white">Privacy Notice</h1>
        <p className="type-body mt-4 max-w-2xl text-muted">
          {BRAND_NAME} is built for consent-first comparison across private collections. We do not
          crawl, index, or search the public internet.
        </p>
      </section>

      <section className="grid gap-5 py-12 md:grid-cols-2">
        {PRIVACY_SECTIONS.map((section) => (
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
