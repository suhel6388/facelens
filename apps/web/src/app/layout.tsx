import type { Metadata } from "next";
import { BRAND_NAME, BRAND_TAGLINE } from "@app/types";
import { AppToaster } from "@/components/layout/app-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description:
    "Consent-first visual similarity search across authorized private image collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
