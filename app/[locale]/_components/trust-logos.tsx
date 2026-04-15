// app/[locale]/_components/trust-logos.tsx
"use client";

function NextjsLogo() {
  return (
    <svg viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 16 L14 8 L14 16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      <path d="M14 8 L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Next.js</text>
    </svg>
  );
}

function TypeScriptLogo() {
  return (
    <svg viewBox="0 0 88 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <rect x="1" y="1" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <text x="5" y="16" fontSize="10" fontFamily="system-ui, sans-serif" fontWeight="800" fill="currentColor">TS</text>
      <text x="30" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">TypeScript</text>
    </svg>
  );
}

function PostgreSQLLogo() {
  return (
    <svg viewBox="0 0 102 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <ellipse cx="12" cy="8" rx="9" ry="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 8 L3 16 Q3 21 12 21 Q21 21 21 16 L21 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">PostgreSQL</text>
    </svg>
  );
}

function DockerLogo() {
  return (
    <svg viewBox="0 0 76 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <rect x="2" y="9" width="5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="9" width="5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="14" y="9" width="5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="4" width="5" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 15 Q8 22 20 17" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Docker</text>
    </svg>
  );
}

function RedisLogo() {
  return (
    <svg viewBox="0 0 66 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <ellipse cx="12" cy="16" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="12" cy="11" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <ellipse cx="12" cy="7" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="11" x2="3" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="21" y1="11" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Redis</text>
    </svg>
  );
}

function KubernetesLogo() {
  return (
    <svg viewBox="0 0 108 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="4" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="12" y1="14.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1"/>
      <line x1="4" y1="8" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="15" y1="13.5" x2="20" y2="16" stroke="currentColor" strokeWidth="1"/>
      <line x1="20" y1="8" x2="15" y2="10.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="9" y1="13.5" x2="4" y2="16" stroke="currentColor" strokeWidth="1"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Kubernetes</text>
    </svg>
  );
}

function VercelLogo() {
  return (
    <svg viewBox="0 0 68 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <path d="M12 3 L22 20 L2 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <text x="28" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Vercel</text>
    </svg>
  );
}

function LinuxLogo() {
  return (
    <svg viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
      <path d="M12 2 C8 2 5 5 5 10 L5 16 C5 18 7 20 9 20 L15 20 C17 20 19 18 19 16 L19 10 C19 5 16 2 12 2 Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
      <path d="M9 15 Q12 17 15 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <text x="26" y="16" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor" letterSpacing="0.02em">Linux</text>
    </svg>
  );
}

const TECH_LOGOS = [
  { id: "nextjs",     Component: NextjsLogo },
  { id: "typescript", Component: TypeScriptLogo },
  { id: "postgresql", Component: PostgreSQLLogo },
  { id: "docker",     Component: DockerLogo },
  { id: "redis",      Component: RedisLogo },
  { id: "kubernetes", Component: KubernetesLogo },
  { id: "vercel",     Component: VercelLogo },
  { id: "linux",      Component: LinuxLogo },
];

const REPEATED = [...TECH_LOGOS, ...TECH_LOGOS];

export function TrustLogos() {
  return (
    <section className="border-y border-[var(--border)] py-6 overflow-hidden">
      <div className="flex items-center gap-4 px-8 mb-5">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
          Trusted infrastructure
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <div className="relative overflow-hidden">
        <div className="flex gap-14 marquee w-max">
          {REPEATED.map(({ id, Component }, i) => (
            <div
              key={`${id}-${i}`}
              className="flex-shrink-0 flex items-center justify-center text-[var(--text-muted)] opacity-40 hover:opacity-80 hover:text-white transition-all duration-300"
            >
              <Component />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
