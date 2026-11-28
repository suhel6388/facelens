import { notFound } from "next/navigation";
import { AdminPortalView, type AdminSection } from "@/components/admin/admin-portal";

const VALID_SECTIONS = new Set<AdminSection>([
  "users",
  "workspaces",
  "subscriptions",
  "payments",
  "analytics",
  "audit-logs",
  "system-health",
  "deletion-requests",
]);

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!VALID_SECTIONS.has(section as AdminSection)) {
    notFound();
  }
  return <AdminPortalView section={section as AdminSection} />;
}
