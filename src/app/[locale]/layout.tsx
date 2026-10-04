import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
// Self-hosted variable font. Bundled by the build, so there is no third-party
// request, no build-time dependency on Google, and an installed PWA still
// renders in the brand typeface with no connection.
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/fraunces/standard.css";
import "../globals.css";
import { isLocale, LOCALES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

/**
 * This is the root layout. Every route lives under a locale segment, and
 * middleware redirects anything without one, so the html tag belongs here
 * where the language is actually known.
 */

export const viewport: Viewport = {
  themeColor: "#f8f4ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "id");

  return {
    title: {
      default: `${dict.brand.name} — ${dict.brand.tagline}`,
      template: `%s · ${dict.brand.name}`,
    },
    description: dict.home.todayLead,
    applicationName: dict.brand.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: dict.brand.name, statusBarStyle: "default" },
    icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale satisfies Locale}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
