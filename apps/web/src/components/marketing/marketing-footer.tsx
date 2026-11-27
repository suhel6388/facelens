import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { BrandLogo } from "@app/ui";

const PRODUCT_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms and conditions" },
  { href: "/contact", label: "Contact" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandLogo />
            <p className="type-support mt-3 max-w-md">
              {BRAND_NAME} provides consent-first visual similarity comparisons exclusively across
              authorized private image collections. Similarity estimates do not establish identity,
              and {BRAND_NAME} does not search or index the public internet.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Product</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {PRODUCT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Trust &amp; Legal</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {BRAND_NAME}. Authorized private collections only.
          </p>
          <p>Similarity is an estimate, not identity verification.</p>
        </div>
      </div>
    </footer>
  );
}
