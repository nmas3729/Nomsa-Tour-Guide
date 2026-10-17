import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { HomeReturnButton } from "@/src/components/navigation/home-return-button";
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
    default: "Nomsa Tour Guides",
    template: "%s | Nomsa Tour Guides",
  },
  description: "Locally led walks, safaris, tastings, and cultural experiences across South Africa.",
  openGraph: {
    type: "website",
    siteName: "Nomsa Tour Guides",
    locale: "en_ZA",
    title: "Nomsa Tour Guides",
    description: "Locally led walks, safaris, tastings, and cultural experiences across South Africa.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nomsa Tour Guides",
    description: "Locally led walks, safaris, tastings, and cultural experiences across South Africa.",
  },
};

export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <HomeReturnButton />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          nonce={nonce}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
