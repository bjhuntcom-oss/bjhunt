// app/[locale]/page.tsx
import { Hero } from "./_components/hero";
import { TrustLogos } from "./_components/trust-logos";
import { FeaturesSection } from "./_components/features-section";
import { APISection } from "./_components/api-section";
import { PricingTeaser } from "./_components/pricing-teaser";
import { CTASection } from "./_components/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustLogos />
      <FeaturesSection />
      <APISection />
      <PricingTeaser />
      <CTASection />
    </>
  );
}
