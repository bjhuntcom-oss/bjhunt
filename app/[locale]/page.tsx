import { HomeHero } from "./_components/hero";
import { TrustLogos } from "./_components/trust-logos";
import { FeaturesSection } from "./_components/features-section";
import { HomeStats } from "./_components/home-stats";
import { PricingTeaser } from "./_components/pricing-teaser";
import { CTASection } from "./_components/cta-section";

export default function Home() {
  return (
    <>
      <HomeHero />
      <TrustLogos />
      <FeaturesSection />
      <HomeStats />
      <PricingTeaser />
      <CTASection />
    </>
  );
}
