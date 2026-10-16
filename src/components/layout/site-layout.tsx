import type { ReactNode } from "react";
import { Footer } from "@/src/components/navigation/footer";
import { TopNavigation } from "@/src/components/navigation/top-navigation";
import { AmbientBackground } from "@/src/components/ui/ambient-background";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell flex min-h-screen flex-col">
      <AmbientBackground />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <TopNavigation />
      <main className="site-shell__content flex-1" id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
