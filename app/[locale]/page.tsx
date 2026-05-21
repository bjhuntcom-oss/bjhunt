import { HomeHero } from "./_components/hero";
import { WhySection } from "./_components/why-section";
import { UseCasesSection } from "./_components/use-cases-section";
import { HowItWorks } from "./_components/how-it-works";
import { FeaturesGrid } from "./_components/features-grid";
import { InYourCode } from "./_components/in-your-code";
import { FinalCta } from "./_components/final-cta";

export default function Home() {
  return (
    <>
      <HomeHero />
      <WhySection />
      <UseCasesSection />
      <HowItWorks />
      <FeaturesGrid />
      <InYourCode />
      <FinalCta />
    </>
  );
}
