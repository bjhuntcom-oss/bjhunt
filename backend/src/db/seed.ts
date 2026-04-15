/**
 * Seed script — populates the database with test data.
 * Run with: bun run src/db/seed.ts
 */

import { sql } from "./client.js";
import { hashPassword } from "../auth/password.js";

async function seed() {
  console.log("Seeding database...");

  // ── Organization ──────────────────────────────────────────────────
  const [org] = await sql`
    INSERT INTO organizations (id, name, slug, plan)
    VALUES ('00000000-0000-0000-0000-000000000001', 'BJHUNT Team', 'bjhunt-team', 'pro')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  const orgId = org?.id || '00000000-0000-0000-0000-000000000001';
  console.log("  Org:", orgId);

  // ── Admin user ────────────────────────────────────────────────────
  const adminHash = await hashPassword("admin1234567!");
  const [admin] = await sql`
    INSERT INTO users (id, org_id, email, password_hash, display_name, role, is_platform_admin)
    VALUES ('00000000-0000-0000-0000-000000000010', ${orgId},
            'admin@bjhunt.com', ${adminHash}, 'Admin', 'owner', true)
    ON CONFLICT (email) DO UPDATE SET password_hash = ${adminHash}, is_platform_admin = true
    RETURNING id, email
  `;
  console.log("  Admin:", admin?.email, "(password: admin1234567!)");

  // ── Regular user ──────────────────────────────────────────────────
  const userHash = await hashPassword("user12345678!");
  const [user] = await sql`
    INSERT INTO users (id, org_id, email, password_hash, display_name, role)
    VALUES ('00000000-0000-0000-0000-000000000020', ${orgId},
            'user@bjhunt.com', ${userHash}, 'Test User', 'member')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${userHash}
    RETURNING id, email
  `;
  console.log("  User:", user?.email, "(password: user12345678!)");

  // ── Engagements ───────────────────────────────────────────────────
  const engagements = [
    { name: "Web App Pentest - example.com", target: "https://example.com", status: "completed" },
    { name: "Internal Network Scan", target: "192.168.1.0/24", status: "running" },
    { name: "Cloud Infrastructure Audit", target: "aws:prod-account", status: "draft" },
    { name: "API Security Review", target: "https://api.example.com", status: "completed" },
  ];

  for (const eng of engagements) {
    const [e] = await sql`
      INSERT INTO engagements (org_id, created_by, name, target, status, agent_graph,
                               started_at, completed_at)
      VALUES (${orgId}, ${admin!.id}, ${eng.name}, ${eng.target}, ${eng.status}, 'bjhunt',
              ${eng.status !== "draft" ? new Date(Date.now() - 86400000) : null},
              ${eng.status === "completed" ? new Date() : null})
      RETURNING id, name
    `;
    console.log("  Engagement:", e?.name);

    // Add findings for completed engagements
    if (eng.status === "completed") {
      const findings = [
        { title: "SQL Injection in /api/search", severity: "critical", cvss: 9.8, mitre: ["T1190"] },
        { title: "Missing CSRF Protection", severity: "high", cvss: 7.5, mitre: ["T1557"] },
        { title: "Information Disclosure via Error Pages", severity: "medium", cvss: 5.3, mitre: ["T1005"] },
        { title: "Missing Security Headers", severity: "low", cvss: 3.1, mitre: ["T1071"] },
        { title: "Server Version Disclosure", severity: "info", cvss: 0.0, mitre: ["T1592"] },
      ];

      for (const f of findings) {
        await sql`
          INSERT INTO findings (org_id, engagement_id, title, severity, cvss_score, mitre_attack,
                                description, remediation, status)
          VALUES (${orgId}, ${e!.id}, ${f.title}, ${f.severity}, ${f.cvss},
                  ${f.mitre}, ${"Detailed description of " + f.title},
                  ${"Recommended fix for " + f.title}, 'open')
        `;
      }
      console.log("    + 5 findings");
    }
  }

  // ── Chat conversations + messages ──────────────────────────────────
  const [firstEng] = await sql`SELECT id FROM engagements WHERE org_id = ${orgId} LIMIT 1`;
  if (firstEng) {
    const [conv] = await sql`
      INSERT INTO chat_conversations (org_id, user_id, engagement_id, title)
      VALUES (${orgId}, ${admin!.id}, ${firstEng.id}, 'Initial Scan Discussion')
      RETURNING id
    `;

    const messages = [
      { role: "user", content: "Scan example.com for SQL injection vulnerabilities" },
      { role: "assistant", content: "I'll start scanning example.com for SQL injection vulnerabilities. Let me use the recon agent first to enumerate the attack surface, then the exploit agent to test for SQLi.\n\n**Phase 1: Reconnaissance**\n- Discovering endpoints via directory brute-force\n- Testing input parameters for injection points\n\n**Phase 2: Exploitation**\n- Found `/api/search?q=` parameter vulnerable to UNION-based SQLi\n- Confirmed with: `' UNION SELECT NULL,NULL,NULL--`\n\n**Finding: SQL Injection (Critical)**\n- CVSS: 9.8\n- Endpoint: `/api/search`\n- Impact: Full database access" },
      { role: "user", content: "Can you check for CSRF protections too?" },
      { role: "assistant", content: "Checking CSRF protections across all state-changing endpoints...\n\n**Results:**\n- POST `/api/users` - No CSRF token required ❌\n- POST `/api/settings` - No CSRF token required ❌\n- DELETE `/api/items/:id` - No CSRF token required ❌\n\n**Finding: Missing CSRF Protection (High)**\n- CVSS: 7.5\n- All state-changing POST/PUT/DELETE endpoints lack CSRF tokens\n- Recommendation: Implement SameSite cookies + CSRF tokens" },
    ];

    for (const m of messages) {
      await sql`
        INSERT INTO chat_messages (org_id, conversation_id, role, content)
        VALUES (${orgId}, ${conv!.id}, ${m.role}, ${m.content})
      `;
    }
    console.log("  Chat: 1 conversation, 4 messages");
  }

  // ── Agent runs ────────────────────────────────────────────────────
  if (firstEng) {
    const agents = ["recon", "exploit", "analyst", "postexploit"];
    for (const agent of agents) {
      await sql`
        INSERT INTO agent_runs (org_id, engagement_id, agent_name, status,
                                input_summary, output_summary, tokens_input, tokens_output,
                                duration_ms, started_at, completed_at)
        VALUES (${orgId}, ${firstEng.id}, ${agent}, 'completed',
                ${"Scanning " + engagements[0]!.target},
                ${"Found vulnerabilities via " + agent + " agent"},
                ${Math.floor(Math.random() * 5000) + 1000},
                ${Math.floor(Math.random() * 2000) + 500},
                ${Math.floor(Math.random() * 30000) + 5000},
                ${new Date(Date.now() - 86400000)}, ${new Date()})
      `;
    }
    console.log("  Agent runs: 4 completed");
  }

  // ── Audit logs ────────────────────────────────────────────────────
  const actions = [
    "user.register", "user.login", "user.login", "engagement.create",
    "engagement.launch", "chat.message", "chat.message", "engagement.update",
    "api_key.create", "user.login", "engagement.create", "user.change_password",
  ];
  for (const action of actions) {
    await sql`
      INSERT INTO audit_logs (org_id, user_id, action, ip_address)
      VALUES (${orgId}, ${admin!.id}, ${action}, '127.0.0.1')
    `;
  }
  console.log("  Audit logs: 12 entries");

  // ── Notifications ─────────────────────────────────────────────────
  const notifs = [
    { type: "finding_critical", title: "Critical finding discovered", message: "SQL Injection found in example.com" },
    { type: "engagement_completed", title: "Assessment complete", message: "Web App Pentest finished with 5 findings" },
    { type: "system", title: "Welcome to BJHUNT ALPHA 1.0", message: "Your platform is ready to use" },
  ];
  for (const n of notifs) {
    await sql`
      INSERT INTO notifications (org_id, user_id, type, title, message)
      VALUES (${orgId}, ${admin!.id}, ${n.type}, ${n.title}, ${n.message})
    `;
  }
  console.log("  Notifications: 3");

  // ── Platform settings ─────────────────────────────────────────────
  await sql`
    INSERT INTO platform_settings (key, value) VALUES
      ('platform_name', '"BJHUNT ALPHA 1.0"'),
      ('platform_description', '"AI-Powered Autonomous Cybersecurity Platform"'),
      ('gateway_config', ${JSON.stringify({
        providers: {
          anthropic: { name: "Anthropic", enabled: true, models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"] },
          openai: { name: "OpenAI", enabled: true, models: ["gpt-5.4", "gpt-4.1"] },
          "ollama-cloud": { name: "Ollama Cloud", enabled: true, models: ["deepseek-v3.2", "kimi-k2"] },
        },
        defaults: { model: "claude-sonnet-4-6" },
      })})
    ON CONFLICT (key) DO NOTHING
  `;
  console.log("  Platform settings: 3");

  console.log("\nSeed complete!");
  console.log("\n  Admin login:  admin@bjhunt.com / admin1234567!");
  console.log("  User login:   user@bjhunt.com / user12345678!");

  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
