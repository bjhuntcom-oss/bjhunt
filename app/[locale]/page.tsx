import { HomeHero } from "./_components/hero";
import { TrustLogos } from "./_components/trust-logos";
import { FeaturesSection } from "./_components/features-section";
import { HomeStats } from "./_components/home-stats";
import { PricingTeaser } from "./_components/pricing-teaser";
import { CTASection } from "./_components/cta-section";

function ToolsMarquee() {
  const tools = [
    "Nmap", "Nuclei", "Burp Suite", "Nessus", "Invicti",
    "SQLMap", "Amass", "Wireshark", "Metasploit", "OWASP ZAP",
    "ffuf", "Subfinder", "Nikto", "Dirsearch", "Gobuster"
  ];
  const items = [...tools, ...tools];

  return (
    <section className="relative overflow-hidden border-y border-border/50 bg-muted/30 py-8">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          will-change: transform;
        }
      `}</style>
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
        {items.map((tool, i) => (
          <span key={`${tool}-${i}`} className="font-mono text-[14px] text-muted-foreground select-none">
            {tool}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HomeHero />
      <TrustLogos />
      <FeaturesSection />
      <HomeStats />
      <ToolsMarquee />
      <PricingTeaser />
      <CTASection />
    </>
  );
}
