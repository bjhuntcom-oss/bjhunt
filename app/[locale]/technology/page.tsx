// app/[locale]/technology/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

/* ── animation variants ──────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ================================================================
   SECTION 1 — HERO
   ================================================================ */
function HeroSection() {
  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden border-b border-[var(--border)]">
      {/* Animated neural-network SVG background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid lines */}
          {Array.from({ length: 30 }).map((_, i) => (
            <line
              key={`gv-${i}`}
              x1={i * 40}
              y1={0}
              x2={i * 40}
              y2={600}
              stroke="#1a1a1a"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 15 }).map((_, i) => (
            <line
              key={`gh-${i}`}
              x1={0}
              y1={i * 40}
              x2={1200}
              y2={i * 40}
              stroke="#1a1a1a"
              strokeWidth="0.5"
            />
          ))}

          {/* Neural network edges */}
          {[
            [200, 150, 400, 280],
            [400, 280, 650, 180],
            [650, 180, 900, 320],
            [900, 320, 1050, 200],
            [400, 280, 550, 420],
            [550, 420, 800, 380],
            [800, 380, 900, 320],
            [200, 150, 350, 80],
            [350, 80, 650, 180],
            [550, 420, 750, 500],
            [750, 500, 1050, 200],
            [150, 350, 400, 280],
            [150, 350, 550, 420],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={`edge-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#00cc8a"
              strokeWidth="0.5"
              opacity="0"
              className="tech-edge"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}

          {/* Neural network nodes */}
          {[
            [200, 150, 4],
            [400, 280, 5],
            [650, 180, 4],
            [900, 320, 5],
            [1050, 200, 3],
            [550, 420, 4],
            [800, 380, 3],
            [350, 80, 3],
            [750, 500, 3],
            [150, 350, 4],
          ].map(([cx, cy, r], i) => (
            <g key={`node-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={r as number * 3}
                fill="none"
                stroke="#00cc8a"
                strokeWidth="0.5"
                opacity="0"
                className="tech-node-ring"
                style={{ animationDelay: `${i * 0.25 + 0.5}s` }}
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="#00cc8a"
                opacity="0"
                className="tech-node"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="relative z-10 w-full px-8 md:px-16 py-24 md:py-32">
        <motion.div
          className="max-w-3xl"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Technologie</SectionLabel>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-[40px] md:text-[56px] lg:text-[64px] font-black leading-[0.95] tracking-[-0.03em] text-white mt-6"
          >
            LA TECHNOLOGIE<br />
            <span className="text-[var(--text-muted)]">DERRIERE BJHUNT</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-sm md:text-base text-[var(--text-muted)] leading-relaxed mt-6 max-w-xl"
          >
            17 agents IA autonomes. Un cycle d&apos;attaque-defense continu.
            La cybersecurite du futur.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8">
            <Button asChild variant="secondary" size="lg">
              <Link href="/technology/deep-dive">Explorer en detail →</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 2 — MULTI-AGENT ORCHESTRATION
   ================================================================ */
function OrchestrationSection() {
  const agents = [
    { label: "RECON", angle: -72, desc: "Reconnaissance" },
    { label: "EXPLOIT", angle: -144, desc: "Exploitation" },
    { label: "ANALYST", angle: 144, desc: "Analyse" },
    { label: "CLOUD", angle: 72, desc: "Cloud" },
    { label: "DEFENSE", angle: 0, desc: "Defense" },
  ];

  const cx = 300;
  const cy = 200;
  const radius = 140;

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Architecture</SectionLabel>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] text-white mt-4"
          >
            ORCHESTRATION<br />
            <span className="text-[var(--text-muted)]">MULTI-AGENT</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-[var(--text-muted)] leading-relaxed mt-4 max-w-lg"
          >
            Nos 17 agents IA specialises travaillent ensemble comme une equipe
            de pentesters experimentes. Chaque agent maitrise un domaine :
            reconnaissance, exploitation, analyse, defense.
          </motion.p>

          {/* Animated SVG — hub & spoke */}
          <motion.div
            variants={fadeUp}
            className="mt-12 flex justify-center"
          >
            <svg
              viewBox="0 0 600 400"
              className="w-full max-w-2xl"
              style={{ height: 320 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Connection lines from center to each agent */}
              {agents.map((agent, i) => {
                const ax = cx + radius * Math.cos((agent.angle * Math.PI) / 180);
                const ay = cy + radius * Math.sin((agent.angle * Math.PI) / 180);
                return (
                  <line
                    key={`conn-${i}`}
                    x1={cx}
                    y1={cy}
                    x2={ax}
                    y2={ay}
                    stroke="#00cc8a"
                    strokeWidth="1"
                    className="tech-orch-line"
                    style={{ animationDelay: `${i * 0.6}s` }}
                  />
                );
              })}

              {/* Outer ring connecting agents */}
              {agents.map((agent, i) => {
                const next = agents[(i + 1) % agents.length];
                const ax = cx + radius * Math.cos((agent.angle * Math.PI) / 180);
                const ay = cy + radius * Math.sin((agent.angle * Math.PI) / 180);
                const bx = cx + radius * Math.cos((next.angle * Math.PI) / 180);
                const by = cy + radius * Math.sin((next.angle * Math.PI) / 180);
                return (
                  <line
                    key={`ring-${i}`}
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    stroke="#2a2a2a"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Center hub */}
              <circle
                cx={cx}
                cy={cy}
                r={32}
                fill="#0a0a0a"
                stroke="#00cc8a"
                strokeWidth="1.5"
                className="tech-hub-pulse"
              />
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BJHUNT
              </text>
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fill="#666"
                fontSize="7"
                fontFamily="monospace"
              >
                CORE
              </text>

              {/* Agent nodes */}
              {agents.map((agent, i) => {
                const ax = cx + radius * Math.cos((agent.angle * Math.PI) / 180);
                const ay = cy + radius * Math.sin((agent.angle * Math.PI) / 180);
                return (
                  <g
                    key={`agent-${i}`}
                    className="tech-agent-node"
                    style={{ animationDelay: `${i * 0.6}s` }}
                  >
                    <circle
                      cx={ax}
                      cy={ay}
                      r={24}
                      fill="#0a0a0a"
                      stroke="#2a2a2a"
                      strokeWidth="1"
                    />
                    <circle
                      cx={ax}
                      cy={ay}
                      r={24}
                      fill="none"
                      stroke="#00cc8a"
                      strokeWidth="1"
                      opacity="0"
                      className="tech-agent-glow"
                      style={{ animationDelay: `${i * 0.6}s` }}
                    />
                    <text
                      x={ax}
                      y={ay - 2}
                      textAnchor="middle"
                      fill="white"
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {agent.label}
                    </text>
                    <text
                      x={ax}
                      y={ay + 8}
                      textAnchor="middle"
                      fill="#4a4a4a"
                      fontSize="6"
                      fontFamily="monospace"
                    >
                      {agent.desc}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-3 gap-px bg-[var(--border)] mt-12 max-w-2xl mx-auto"
          >
            {[
              { value: "17", label: "Agents IA" },
              { value: "100+", label: "Outils integres" },
              { value: "24/7", label: "Autonome" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="bg-[var(--bg-card)] px-6 py-6 text-center"
              >
                <div className="text-2xl md:text-3xl font-black font-mono text-white">
                  {value}
                </div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 3 — VACCINE LOOP
   ================================================================ */
function VaccineLoopSection() {
  const phases = [
    { label: "ATTACK", x: 300, y: 60 },
    { label: "BRIEF", x: 500, y: 200 },
    { label: "DEFENSE", x: 300, y: 340 },
    { label: "VERIFY", x: 100, y: 200 },
  ];

  // Path connecting all 4 nodes in a loop
  const loopPath = "M 300 90 Q 430 80 490 175 Q 530 260 410 330 Q 330 370 230 330 Q 80 270 110 200 Q 120 100 300 90 Z";

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Processus</SectionLabel>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] text-white mt-4"
          >
            LE CYCLE<br />
            <span className="text-[var(--text-muted)]">VACCIN</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-[var(--text-muted)] leading-relaxed mt-4 max-w-lg"
          >
            BJHUNT ne se contente pas de trouver les failles — il les corrige
            et verifie que la correction tient. Un cycle continu : Attaque →
            Defense → Verification.
          </motion.p>

          {/* Animated SVG — loop cycle */}
          <motion.div variants={fadeUp} className="mt-12 flex justify-center">
            <svg
              viewBox="0 0 600 400"
              className="w-full max-w-2xl"
              style={{ height: 300 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Loop path background */}
              <path
                d={loopPath}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1"
              />

              {/* Animated tracing path */}
              <path
                d={loopPath}
                fill="none"
                stroke="#00cc8a"
                strokeWidth="1.5"
                className="tech-loop-trace"
              />

              {/* Connection lines between nodes */}
              {phases.map((phase, i) => {
                const next = phases[(i + 1) % phases.length];
                return (
                  <line
                    key={`phase-line-${i}`}
                    x1={phase.x}
                    y1={phase.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="#2a2a2a"
                    strokeWidth="0.5"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Phase nodes */}
              {phases.map((phase, i) => (
                <g key={`phase-${i}`}>
                  <circle
                    cx={phase.x}
                    cy={phase.y}
                    r={28}
                    fill="#0a0a0a"
                    stroke="#2a2a2a"
                    strokeWidth="1"
                  />
                  <circle
                    cx={phase.x}
                    cy={phase.y}
                    r={28}
                    fill="none"
                    stroke="#00cc8a"
                    strokeWidth="1.5"
                    opacity="0"
                    className="tech-phase-glow"
                    style={{ animationDelay: `${i * 1}s` }}
                  />
                  <text
                    x={phase.x}
                    y={phase.y + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {phase.label}
                  </text>
                </g>
              ))}

              {/* Arrows between nodes */}
              <defs>
                <marker
                  id="arrowGreen"
                  markerWidth="6"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2, 0 4" fill="#00cc8a" />
                </marker>
              </defs>
              {phases.map((phase, i) => {
                const next = phases[(i + 1) % phases.length];
                const dx = next.x - phase.x;
                const dy = next.y - phase.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = dx / len;
                const ny = dy / len;
                const sx = phase.x + nx * 32;
                const sy = phase.y + ny * 32;
                const ex = next.x - nx * 32;
                const ey = next.y - ny * 32;
                return (
                  <line
                    key={`arrow-${i}`}
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke="#00cc8a"
                    strokeWidth="1"
                    markerEnd="url(#arrowGreen)"
                    opacity="0.6"
                    className="tech-arrow-fade"
                    style={{ animationDelay: `${i * 1}s` }}
                  />
                );
              })}
            </svg>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-xs text-[var(--text-subtle)] text-center mt-6 max-w-md mx-auto leading-relaxed"
          >
            Chaque vulnerabilite decouverte est automatiquement corrigee puis
            re-testee pour confirmer la correction.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 4 — KNOWLEDGE GRAPH
   ================================================================ */
function KnowledgeGraphSection() {
  // Nodes: { x, y, r, type }
  const nodes = [
    { x: 150, y: 120, r: 8, type: "host" },
    { x: 300, y: 80, r: 10, type: "service" },
    { x: 450, y: 140, r: 6, type: "vuln" },
    { x: 200, y: 260, r: 7, type: "cred" },
    { x: 380, y: 300, r: 9, type: "host" },
    { x: 520, y: 240, r: 6, type: "vuln" },
    { x: 100, y: 180, r: 5, type: "cred" },
    { x: 480, y: 50, r: 7, type: "service" },
  ];

  const edges = [
    [0, 1],
    [1, 2],
    [0, 6],
    [0, 3],
    [3, 4],
    [4, 5],
    [1, 7],
    [7, 5],
    [2, 5],
    [3, 6],
  ];

  const typeColor: Record<string, string> = {
    host: "#ffffff",
    service: "#00cc8a",
    vuln: "#ff4444",
    cred: "#ff9900",
  };

  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Intelligence</SectionLabel>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] text-white mt-4"
          >
            GRAPHE DE<br />
            <span className="text-[var(--text-muted)]">CONNAISSANCES</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-[var(--text-muted)] leading-relaxed mt-4 max-w-lg"
          >
            Chaque decouverte enrichit un graphe de connaissances en temps
            reel. BJHUNT construit une carte complete de votre surface
            d&apos;attaque et identifie les chaines d&apos;exploitation les
            plus dangereuses.
          </motion.p>

          {/* Animated SVG — knowledge graph */}
          <motion.div variants={fadeUp} className="mt-12 flex justify-center">
            <svg
              viewBox="0 0 620 360"
              className="w-full max-w-2xl"
              style={{ height: 280 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Edges — draw progressively */}
              {edges.map(([a, b], i) => (
                <line
                  key={`kg-edge-${i}`}
                  x1={nodes[a].x}
                  y1={nodes[a].y}
                  x2={nodes[b].x}
                  y2={nodes[b].y}
                  stroke="#2a2a2a"
                  strokeWidth="1"
                  className="tech-kg-edge"
                  style={{ animationDelay: `${0.8 + i * 0.25}s` }}
                />
              ))}

              {/* Nodes — fade in one by one */}
              {nodes.map((node, i) => (
                <g key={`kg-node-${i}`}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 6}
                    fill="none"
                    stroke={typeColor[node.type]}
                    strokeWidth="0.5"
                    opacity="0"
                    className="tech-kg-node"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={typeColor[node.type]}
                    opacity="0"
                    className="tech-kg-node"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                </g>
              ))}

              {/* Legend */}
              {[
                { color: "#ffffff", label: "Hotes" },
                { color: "#00cc8a", label: "Services" },
                { color: "#ff4444", label: "Vulns" },
                { color: "#ff9900", label: "Credentials" },
              ].map((item, i) => (
                <g key={`legend-${i}`} transform={`translate(40, ${320 + i * 0})`}>
                  {/* Legend placed below SVG — skip for cleanliness */}
                </g>
              ))}
            </svg>
          </motion.div>

          {/* Legend below SVG */}
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-6 mt-4"
          >
            {[
              { color: "#ffffff", label: "Hotes" },
              { color: "#00cc8a", label: "Services" },
              { color: "#ff4444", label: "Vulnerabilites" },
              { color: "#ff9900", label: "Credentials" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] font-mono">
                  {item.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 5 — SANDBOX ISOLATION
   ================================================================ */
function SandboxSection() {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="px-8 md:px-16 py-24 md:py-32">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Securite</SectionLabel>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] text-white mt-4"
          >
            ISOLATION<br />
            <span className="text-[var(--text-muted)]">TOTALE</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-[var(--text-muted)] leading-relaxed mt-4 max-w-lg"
          >
            Chaque test s&apos;execute dans un environnement Kali Linux isole.
            Aucun risque pour votre infrastructure de production. Tests
            destructifs possibles en toute securite.
          </motion.p>

          {/* Animated SVG — sandbox */}
          <motion.div variants={fadeUp} className="mt-12 flex justify-center">
            <svg
              viewBox="0 0 600 280"
              className="w-full max-w-2xl"
              style={{ height: 240 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer dashed border — sandbox container */}
              <rect
                x={150}
                y={40}
                width={300}
                height={200}
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="1.5"
                strokeDasharray="8 4"
                className="tech-sandbox-border"
              />

              {/* Inner solid area */}
              <rect
                x={170}
                y={60}
                width={260}
                height={160}
                fill="#111111"
                stroke="#1a1a1a"
                strokeWidth="0.5"
              />

              {/* Shield icon in center */}
              <g transform="translate(300, 140)">
                <path
                  d="M0 -30 L20 -20 L20 5 C20 20 10 30 0 35 C-10 30 -20 20 -20 5 L-20 -20 Z"
                  fill="none"
                  stroke="#00cc8a"
                  strokeWidth="1.5"
                  className="tech-shield-draw"
                />
                {/* Checkmark inside shield */}
                <path
                  d="M-8 2 L-2 8 L10 -6"
                  fill="none"
                  stroke="#00cc8a"
                  strokeWidth="2"
                  className="tech-shield-check"
                />
              </g>

              {/* Label inside sandbox */}
              <text
                x={300}
                y={100}
                textAnchor="middle"
                fill="#4a4a4a"
                fontSize="8"
                fontFamily="monospace"
              >
                KALI LINUX SANDBOX
              </text>

              {/* Incoming arrow — "test" */}
              <defs>
                <marker
                  id="arrowIn"
                  markerWidth="6"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2, 0 4" fill="#00cc8a" />
                </marker>
                <marker
                  id="arrowOut"
                  markerWidth="6"
                  markerHeight="4"
                  refX="5"
                  refY="2"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2, 0 4" fill="white" />
                </marker>
              </defs>

              {/* Input arrow */}
              <line
                x1={60}
                y1={120}
                x2={145}
                y2={120}
                stroke="#00cc8a"
                strokeWidth="1"
                markerEnd="url(#arrowIn)"
                className="tech-io-arrow"
                style={{ animationDelay: "0.5s" }}
              />
              <text
                x={100}
                y={112}
                textAnchor="middle"
                fill="#00cc8a"
                fontSize="7"
                fontFamily="monospace"
              >
                TEST
              </text>

              {/* Output arrow */}
              <line
                x1={455}
                y1={160}
                x2={540}
                y2={160}
                stroke="white"
                strokeWidth="1"
                markerEnd="url(#arrowOut)"
                className="tech-io-arrow"
                style={{ animationDelay: "1.5s" }}
              />
              <text
                x={500}
                y={152}
                textAnchor="middle"
                fill="white"
                fontSize="7"
                fontFamily="monospace"
              >
                RESULTS
              </text>

              {/* Your Infrastructure — safe, outside */}
              <text
                x={300}
                y={268}
                textAnchor="middle"
                fill="#4a4a4a"
                fontSize="7"
                fontFamily="monospace"
              >
                VOTRE INFRASTRUCTURE RESTE INTACTE
              </text>
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 6 — CTA
   ================================================================ */
function CTASection() {
  return (
    <section className="relative py-32 px-8 text-center overflow-hidden">
      {/* Subtle gradient background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle, rgba(0,204,138,0.04) 0%, transparent 60%)",
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        }}
      >
        <h2 className="text-[36px] md:text-[48px] font-black tracking-[-0.03em] max-w-2xl">
          PRET A SECURISER<br />
          <span className="text-[var(--text-muted)]">VOTRE ENTREPRISE ?</span>
        </h2>
        <div className="flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">Commencer gratuitement</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/contact">Contacter l&apos;equipe →</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
export default function TechnologyPage() {
  return (
    <>
      <HeroSection />
      <OrchestrationSection />
      <VaccineLoopSection />
      <KnowledgeGraphSection />
      <SandboxSection />
      <CTASection />
    </>
  );
}
