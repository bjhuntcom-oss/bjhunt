import type { AppVariables } from "../types.js";
/**
 * Skills catalog routes — list and read engine skill files.
 */

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";
import * as fs from "node:fs";
import * as path from "node:path";

export const skillRoutes = new Hono<{ Variables: AppVariables }>();

skillRoutes.use("*", requireAuth);
skillRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Types ───────────────────────────────────────────────────────────────

interface SkillMeta {
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  allowedTools: string[];
  mitre: string[];
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  timeEstimate: string;
  filePath: string;
}

interface SkillFull extends SkillMeta {
  body: string;
}

// ── Cache ───────────────────────────────────────────────────────────────

let cachedSkills: SkillMeta[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 300_000; // 5 minutes

// ── Engine skills directory ─────────────────────────────────────────────

function getSkillsDir(): string {
  // Try relative path from backend (../engine/skills)
  const candidates = [
    path.resolve(process.cwd(), "engine", "skills"),
    path.resolve(process.cwd(), "..", "engine", "skills"),
    path.resolve(import.meta.dir || process.cwd(), "..", "..", "engine", "skills"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0]!;
}

// ── Parse YAML frontmatter ──────────────────────────────────────────────

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  let body = content;

  if (content.startsWith("---")) {
    const endIdx = content.indexOf("---", 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(3, endIdx).trim();
      body = content.slice(endIdx + 3).trim();
      for (const line of frontmatter.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          // Strip surrounding quotes
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          meta[key] = val;
        }
      }
    }
  }
  return { meta, body };
}

// ── Difficulty heuristic ────────────────────────────────────────────────

function inferDifficulty(category: string, subcategory: string | null): "easy" | "medium" | "hard" {
  const hard = ["exploit", "post-exploit", "ad", "reverser", "contracts"];
  const easy = ["recon", "scanner", "shared", "soundwave"];
  if (hard.includes(category)) return "hard";
  if (easy.includes(category)) return "easy";
  return "medium";
}

// ── Time estimate heuristic ─────────────────────────────────────────────

function inferTimeEstimate(category: string): string {
  const times: Record<string, string> = {
    recon: "15-30 min",
    exploit: "30-60 min",
    "post-exploit": "30-60 min",
    analyst: "20-40 min",
    ad: "30-60 min",
    cloud: "20-40 min",
    contracts: "30-60 min",
    reverser: "45-90 min",
    scanner: "10-20 min",
    detector: "10-20 min",
    verifier: "10-20 min",
    patcher: "15-30 min",
    exploiter: "20-40 min",
    shared: "10-20 min",
    soundwave: "10-15 min",
    decepticon: "5-10 min",
    vulnresearch: "20-40 min",
  };
  return times[category] || "15-30 min";
}

// ── Scan skills directory ───────────────────────────────────────────────

function scanSkills(): SkillMeta[] {
  const skillsDir = getSkillsDir();
  if (!fs.existsSync(skillsDir)) return [];

  const results: SkillMeta[] = [];

  function walk(dir: string, category: string, subcategory: string | null) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // First level = category, deeper = subcategory
        if (category === "") {
          walk(fullPath, entry.name, null);
        } else if (subcategory === null) {
          walk(fullPath, category, entry.name);
        } else {
          // references/ or deeper — skip walking but check for .md
          walk(fullPath, category, subcategory);
        }
      } else if (entry.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const { meta } = parseFrontmatter(content);

          const name = meta.name || entry.name.replace(/\.md$/, "");
          const description = meta.description || "";
          const allowedTools = meta["allowed-tools"]?.split(/\s+/) || [];

          // Parse MITRE ATT&CK techniques
          let mitre: string[] = [];
          const mitreRaw = meta.metadata?.match?.(/mitre_attack:\s*(.+)/)?.[1] || "";
          if (mitreRaw) {
            mitre = mitreRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
          // Also check metadata block in raw content
          const mitreMatch = content.match(/mitre_attack:\s*([^\n]+)/);
          if (mitreMatch) {
            mitre = mitreMatch[1]!.split(",").map((s) => s.trim()).filter(Boolean);
          }

          // Parse tags
          let tags: string[] = [];
          const tagsMatch = content.match(/tags:\s*([^\n]+)/);
          if (tagsMatch) {
            tags = tagsMatch[1]!.split(",").map((s) => s.trim()).filter(Boolean);
          }

          const relPath = path.relative(skillsDir, fullPath).replace(/\\/g, "/");

          results.push({
            name,
            description,
            category: category || "uncategorized",
            subcategory: subcategory !== "references" ? subcategory : null,
            allowedTools,
            mitre,
            tags,
            difficulty: inferDifficulty(category, subcategory),
            timeEstimate: inferTimeEstimate(category),
            filePath: relPath,
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(skillsDir, "", null);
  return results;
}

// ── List all skills ─────────────────────────────────────────────────────

skillRoutes.get("/", async (c) => {
  const now = Date.now();
  if (!cachedSkills || now - cacheTime > CACHE_TTL_MS) {
    cachedSkills = scanSkills();
    cacheTime = now;
  }

  // Optional category filter
  const category = c.req.query("category")?.toLowerCase();
  const q = c.req.query("q")?.toLowerCase();

  let skills = cachedSkills;

  if (category) {
    skills = skills.filter((s) => s.category === category);
  }

  if (q) {
    skills = skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.mitre.some((m) => m.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q),
    );
  }

  // Group by category
  const grouped: Record<string, SkillMeta[]> = {};
  for (const skill of skills) {
    if (!grouped[skill.category]) grouped[skill.category] = [];
    grouped[skill.category]!.push(skill);
  }

  return c.json({ skills, grouped, total: skills.length });
});

// ── Get single skill by category/name ───────────────────────────────────

skillRoutes.get("/:category/:name", async (c) => {
  const category = c.req.param("category");
  const name = c.req.param("name");
  const skillsDir = getSkillsDir();

  // Try multiple possible file paths
  const candidates = [
    path.join(skillsDir, category, name, "SKILL.md"),
    path.join(skillsDir, category, `${name}.md`),
    path.join(skillsDir, category, name + ".md"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const { meta, body } = parseFrontmatter(content);

      const mitre: string[] = [];
      const mitreMatch = content.match(/mitre_attack:\s*([^\n]+)/);
      if (mitreMatch) {
        mitre.push(...mitreMatch[1]!.split(",").map((s) => s.trim()).filter(Boolean));
      }

      let tags: string[] = [];
      const tagsMatch = content.match(/tags:\s*([^\n]+)/);
      if (tagsMatch) {
        tags = tagsMatch[1]!.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const skill: SkillFull = {
        name: meta.name || name,
        description: meta.description || "",
        category,
        subcategory: null,
        allowedTools: meta["allowed-tools"]?.split(/\s+/) || [],
        mitre,
        tags,
        difficulty: inferDifficulty(category, null),
        timeEstimate: inferTimeEstimate(category),
        filePath: path.relative(skillsDir, filePath).replace(/\\/g, "/"),
        body,
      };

      return c.json({ skill });
    }
  }

  return c.json({ error: "Skill not found" }, 404);
});
