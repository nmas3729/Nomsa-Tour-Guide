import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { HomeReturnButton } from "@/src/components/navigation/home-return-button";
import { ToastProvider } from "@/src/components/feedback/toast-provider";
import { ThemeProvider } from "@/src/lib/theme/theme-provider";
import { siteUrl } from "@/src/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Nomsa Tour Guides | South Africa, closer",
    template: "%s | Nomsa Tour Guides",
  },
  description: "Discover South Africa through local guides, regional stories, and memorable experiences.",
  openGraph: {
    type: "website",
    siteName: "Nomsa Tour Guides",
    locale: "en_ZA",
    title: "Nomsa Tour Guides | South Africa, closer",
    description: "Discover South Africa through local guides, regional stories, and memorable experiences.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomsa Tour Guides | South Africa, closer",
    description: "Discover South Africa through local guides, regional stories, and memorable experiences.",
  },
};

async function RequestAwareProviders({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      nonce={nonce}
    >
      {children}
      <ToastProvider />
    </ThemeProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <HomeReturnButton />
        <Suspense fallback={children}>
          <RequestAwareProviders>{children}</RequestAwareProviders>
        </Suspense>
      </body>
    </html>
  );
}
