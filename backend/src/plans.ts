/**
 * BJHUNT Plan definitions — single source of truth.
 *
 * Free:       Demo 5 min, rien d'autre
 * Pro:        $200/mois — 5 scans, 10 agents, chat illimite
 * Enterprise: $2,000/mois — 20 scans, 17 agents, API v1, webhooks
 */

export interface PlanLimits {
  scansPerMonth: number;
  agents: string[];
  chatUnlimited: boolean;
  findingsExport: boolean;
  emailNotifications: boolean;
  apiKeyCreation: boolean;
  apiV1Access: boolean;
  webhookIntegrations: boolean;
  customAgentConfig: boolean;
  demoMinutes: number;
  canCreateEngagements: boolean;
  price: number;
  priceDisplay: string;
  // Feature flags
  cveIntel: boolean;
  skillCatalog: boolean;
  knowledgeGraph: boolean;
  toolPlayground: boolean;
  cloudWizard: boolean;
  adBuilder: boolean;
  hackeroneReport: boolean;
  executiveSummary: boolean;
  opplanTracker: boolean;
  vaccineLoop: boolean;
  exportMarkdown: boolean;
  exportCsv: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    scansPerMonth: 0,
    agents: ["bjhunt", "recon", "analyst"],
    chatUnlimited: false,
    findingsExport: false,
    emailNotifications: false,
    apiKeyCreation: false,
    apiV1Access: false,
    webhookIntegrations: false,
    customAgentConfig: false,
    demoMinutes: 5,
    canCreateEngagements: false,
    price: 0,
    priceDisplay: "Gratuit",
    // Feature flags
    cveIntel: false,
    skillCatalog: false,
    knowledgeGraph: false,
    toolPlayground: false,
    cloudWizard: false,
    adBuilder: false,
    hackeroneReport: false,
    executiveSummary: false,
    opplanTracker: false,
    vaccineLoop: false,
    exportMarkdown: false,
    exportCsv: false,
  },
  pro: {
    scansPerMonth: 5,
    agents: [
      "bjhunt", "recon", "exploit", "analyst", "cloud_hunter",
      "ad_operator", "reverser", "postexploit", "soundwave", "defender",
    ],
    chatUnlimited: true,
    findingsExport: true,
    emailNotifications: true,
    apiKeyCreation: true,
    apiV1Access: false,
    webhookIntegrations: false,
    customAgentConfig: false,
    demoMinutes: 0,
    canCreateEngagements: true,
    price: 200,
    priceDisplay: "$200/mo",
    // Feature flags
    cveIntel: true,
    skillCatalog: true,
    knowledgeGraph: false,
    toolPlayground: false,
    cloudWizard: false,
    adBuilder: false,
    hackeroneReport: false,
    executiveSummary: false,
    opplanTracker: true,
    vaccineLoop: true,
    exportMarkdown: true,
    exportCsv: true,
  },
  enterprise: {
    scansPerMonth: 20,
    agents: [
      "bjhunt", "recon", "exploit", "analyst", "cloud_hunter",
      "ad_operator", "reverser", "postexploit", "soundwave", "defender",
      "contract_auditor", "vulnresearch", "scanner", "detector",
      "verifier", "patcher", "exploiter",
    ],
    chatUnlimited: true,
    findingsExport: true,
    emailNotifications: true,
    apiKeyCreation: true,
    apiV1Access: true,
    webhookIntegrations: true,
    customAgentConfig: true,
    demoMinutes: 0,
    canCreateEngagements: true,
    price: 2000,
    priceDisplay: "$2,000/mo",
    // Feature flags
    cveIntel: true,
    skillCatalog: true,
    knowledgeGraph: true,
    toolPlayground: true,
    cloudWizard: true,
    adBuilder: true,
    hackeroneReport: true,
    executiveSummary: true,
    opplanTracker: true,
    vaccineLoop: true,
    exportMarkdown: true,
    exportCsv: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free!;
}
