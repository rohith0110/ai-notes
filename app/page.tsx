import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Workflow } from "@/components/landing/workflow";
import { CTA } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black">
      <LandingNav />
      <Hero />
      <div id="features">
        <Features />
      </div>
      <div id="workflow">
        <Workflow />
      </div>
      <CTA />
      <LandingFooter />
    </main>
  );
}
