"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { browserBackendFetch } from "@/lib/backend-client";
import {
  Cloud,
  Server,
  Database,
  Shield,
  Key,
  HardDrive,
  Loader2,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

type CloudProvider = "aws" | "azure" | "gcp" | "k8s";

interface CloudConfig {
  provider: CloudProvider;
  // AWS
  awsIamPolicy: string;
  awsS3Bucket: string;
  awsEc2Target: string;
  awsCredentialScope: string;
  // Azure
  azureRbac: string;
  azureStorageAccount: string;
  azureManagedIdentity: boolean;
  // GCP
  gcpIamPolicy: string;
  gcpBucket: string;
  gcpMetadataInstance: string;
  // K8s
  k8sRbac: string;
  k8sPodSpec: string;
  k8sScanSecrets: boolean;
}

interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string | null;
  mitreAttack: string[] | null;
  remediation: string | null;
}

interface AssessmentResult {
  engagementId: string;
  status: "running" | "completed" | "failed";
  findings: Finding[];
}

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
  info: "var(--severity-info)",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "var(--severity-critical-bg)",
  high: "var(--severity-high-bg)",
  medium: "var(--severity-medium-bg)",
  low: "var(--severity-low-bg)",
  info: "var(--severity-info-bg)",
};

const PROVIDERS: {
  id: CloudProvider;
  name: string;
  label: string;
  surfaces: string[];
  icon: typeof Cloud;
}[] = [
  {
    id: "aws",
    name: "AWS",
    label: "Amazon Web Services",
    surfaces: ["IAM Privilege Escalation", "S3 Bucket Misconfig", "EC2 Metadata Exposure", "STS Token Abuse"],
    icon: Cloud,
  },
  {
    id: "azure",
    name: "AZURE",
    label: "Microsoft Azure",
    surfaces: ["RBAC Misconfig", "Storage Account Exposure", "Managed Identity Abuse", "Key Vault Secrets"],
    icon: Server,
  },
  {
    id: "gcp",
    name: "GCP",
    label: "Google Cloud Platform",
    surfaces: ["IAM Policy Escalation", "GCS Bucket Exposure", "Metadata API Abuse", "Service Account Keys"],
    icon: Database,
  },
  {
    id: "k8s",
    name: "K8S",
    label: "Kubernetes",
    surfaces: ["RBAC Privilege Escalation", "Pod Security Bypass", "Secret Exposure", "Container Escape"],
    icon: HardDrive,
  },
];

// ── Component ───────────────────────────────────────────────────────────

export default function CloudAssessmentPage() {
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [config, setConfig] = useState<CloudConfig>({
    provider: "aws",
    awsIamPolicy: "",
    awsS3Bucket: "",
    awsEc2Target: "",
    awsCredentialScope: "",
    azureRbac: "",
    azureStorageAccount: "",
    azureManagedIdentity: false,
    gcpIamPolicy: "",
    gcpBucket: "",
    gcpMetadataInstance: "",
    k8sRbac: "",
    k8sPodSpec: "",
    k8sScanSecrets: false,
  });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const updateConfig = useCallback(<K extends keyof CloudConfig>(key: K, value: CloudConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Launch assessment ──────────────────────────────────────────────────

  const handleLaunch = () => {
    if (!selectedProvider) return;

    startTransition(async () => {
      // Build config payload based on provider
      const providerConfig: Record<string, unknown> = { provider: selectedProvider };

      switch (selectedProvider) {
        case "aws":
          if (config.awsIamPolicy.trim()) providerConfig.iamPolicy = config.awsIamPolicy;
          if (config.awsS3Bucket.trim()) providerConfig.s3Bucket = config.awsS3Bucket;
          if (config.awsEc2Target.trim()) providerConfig.ec2Target = config.awsEc2Target;
          if (config.awsCredentialScope.trim()) providerConfig.credentialScope = config.awsCredentialScope;
          break;
        case "azure":
          if (config.azureRbac.trim()) providerConfig.rbacAssignments = config.azureRbac;
          if (config.azureStorageAccount.trim()) providerConfig.storageAccount = config.azureStorageAccount;
          providerConfig.checkManagedIdentity = config.azureManagedIdentity;
          break;
        case "gcp":
          if (config.gcpIamPolicy.trim()) providerConfig.iamPolicy = config.gcpIamPolicy;
          if (config.gcpBucket.trim()) providerConfig.gcsBucket = config.gcpBucket;
          if (config.gcpMetadataInstance.trim()) providerConfig.metadataInstance = config.gcpMetadataInstance;
          break;
        case "k8s":
          if (config.k8sRbac.trim()) providerConfig.rbacOutput = config.k8sRbac;
          if (config.k8sPodSpec.trim()) providerConfig.podSpec = config.k8sPodSpec;
          providerConfig.scanSecrets = config.k8sScanSecrets;
          break;
      }

      const targetName = `Cloud Assessment - ${selectedProvider.toUpperCase()}`;
      const target = selectedProvider === "aws"
        ? config.awsS3Bucket || config.awsEc2Target || "aws-environment"
        : selectedProvider === "azure"
          ? config.azureStorageAccount || "azure-environment"
          : selectedProvider === "gcp"
            ? config.gcpBucket || "gcp-environment"
            : "k8s-cluster";

      try {
        // Create engagement
        const createRes = await browserBackendFetch("/api/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: targetName,
            target,
            targetType: "cloud",
            agentGraph: "cloud_hunter",
            config: providerConfig,
          }),
        });

        if (!createRes.ok) return;
        const { engagement } = await createRes.json();

        // Launch
        await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, {
          method: "POST",
        });

        setResult({
          engagementId: engagement.id,
          status: "running",
          findings: [],
        });

        // Start polling findings
        const interval = setInterval(async () => {
          try {
            const findingsRes = await browserBackendFetch(`/api/engagements/${engagement.id}/findings`);
            if (findingsRes.ok) {
              const { findings } = await findingsRes.json();
              setResult((prev) =>
                prev ? { ...prev, findings: findings || [] } : prev
              );
            }

            const engRes = await browserBackendFetch(`/api/engagements/${engagement.id}`);
            if (engRes.ok) {
              const { engagement: eng } = await engRes.json();
              if (eng.status === "completed" || eng.status === "failed" || eng.status === "cancelled") {
                setResult((prev) =>
                  prev ? { ...prev, status: eng.status } : prev
                );
                clearInterval(interval);
                setPollInterval(null);
              }
            }
          } catch {
            // polling is best-effort
          }
        }, 5000);

        setPollInterval(interval);
      } catch {
        // error handled by UI
      }
    });
  };

  // ── Severity breakdown ─────────────────────────────────────────────────

  const severityCounts = result?.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[14px] font-mono font-bold uppercase tracking-widest text-white">
          Cloud Security Assessment
        </h1>
        <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
          CloudHunter agent — AWS IAM privesc, S3 takeover, K8s RBAC, Terraform secrets
        </p>
      </div>

      {/* Provider selector */}
      <div className="mb-6">
        <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Select Cloud Provider
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PROVIDERS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProvider(p.id);
                  updateConfig("provider", p.id);
                }}
                className={cn(
                  "border p-4 text-left transition-colors group",
                  isSelected
                    ? "border-white bg-[var(--bg-card)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)]"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isSelected ? "text-white" : "text-[var(--text-muted)] group-hover:text-white"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[12px] font-mono font-bold uppercase tracking-wider",
                      isSelected ? "text-white" : "text-[var(--text-muted)] group-hover:text-white"
                    )}
                  >
                    {p.name}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[var(--text-subtle)] mb-3">
                  {p.label}
                </div>
                <div className="space-y-1">
                  {p.surfaces.map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <ChevronRight className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                      <span className="text-[8px] font-mono text-[var(--text-muted)]">{s}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider-specific form */}
      {selectedProvider && (
        <div className="border border-[var(--border)] mb-6">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
              {PROVIDERS.find((p) => p.id === selectedProvider)?.name} Configuration
            </h2>
          </div>

          <div className="p-4 space-y-4">
            {/* AWS */}
            {selectedProvider === "aws" && (
              <>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    IAM Policy JSON
                  </label>
                  <textarea
                    value={config.awsIamPolicy}
                    onChange={(e) => updateConfig("awsIamPolicy", e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}'
                    spellCheck={false}
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Paste an IAM policy to analyze for privilege escalation paths.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    S3 Bucket Name or Domain
                  </label>
                  <input
                    value={config.awsS3Bucket}
                    onChange={(e) => updateConfig("awsS3Bucket", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                    placeholder="my-company-backups.s3.amazonaws.com"
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Check for public access, ACL misconfigurations, and bucket policy issues.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    EC2 Metadata Target
                  </label>
                  <input
                    value={config.awsEc2Target}
                    onChange={(e) => updateConfig("awsEc2Target", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                    placeholder="10.0.1.50 or ssrf-vulnerable.example.com"
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Check for IMDS v1/v2 exposure and SSRF-to-credential paths.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    Credential Scope
                  </label>
                  <textarea
                    value={config.awsCredentialScope}
                    onChange={(e) => updateConfig("awsCredentialScope", e.target.value)}
                    rows={3}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder="Access Key ID, account ID, or role ARN for scope context"
                  />
                </div>
              </>
            )}

            {/* Azure */}
            {selectedProvider === "azure" && (
              <>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    RBAC Role Assignments JSON
                  </label>
                  <textarea
                    value={config.azureRbac}
                    onChange={(e) => updateConfig("azureRbac", e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder='[{"principalId":"...","roleDefinitionName":"Contributor","scope":"/subscriptions/..."}]'
                    spellCheck={false}
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Paste az role assignment list output to analyze for privilege escalation.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    Storage Account Name
                  </label>
                  <input
                    value={config.azureStorageAccount}
                    onChange={(e) => updateConfig("azureStorageAccount", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                    placeholder="mystorageaccount"
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Check for anonymous access, shared access signatures, and key exposure.
                  </p>
                </div>
                <div>
                  <label
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => updateConfig("azureManagedIdentity", !config.azureManagedIdentity)}
                  >
                    <div
                      className={cn(
                        "w-3.5 h-3.5 border flex items-center justify-center transition-colors",
                        config.azureManagedIdentity
                          ? "border-[var(--success)] bg-[var(--success)]"
                          : "border-[var(--border-strong)] group-hover:border-[var(--text-muted)]"
                      )}
                    >
                      {config.azureManagedIdentity && (
                        <CheckCircle className="w-2.5 h-2.5 text-black" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-white">
                        Check Managed Identity Exposure
                      </span>
                      <p className="text-[8px] font-mono text-[var(--text-subtle)]">
                        Probe for IMDS-based managed identity token theft from compromised VMs.
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* GCP */}
            {selectedProvider === "gcp" && (
              <>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    GCP IAM Policy JSON
                  </label>
                  <textarea
                    value={config.gcpIamPolicy}
                    onChange={(e) => updateConfig("gcpIamPolicy", e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder='{"bindings":[{"role":"roles/owner","members":["user:admin@example.com"]}]}'
                    spellCheck={false}
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Paste gcloud projects get-iam-policy output to analyze for escalation.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    GCS Bucket Name
                  </label>
                  <input
                    value={config.gcpBucket}
                    onChange={(e) => updateConfig("gcpBucket", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                    placeholder="my-company-data"
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Check for public access, uniform bucket-level access, and ACL issues.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    Metadata Instance
                  </label>
                  <input
                    value={config.gcpMetadataInstance}
                    onChange={(e) => updateConfig("gcpMetadataInstance", e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)]"
                    placeholder="10.128.0.5 or ssrf-target.example.com"
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Check for metadata API access and service account token exposure.
                  </p>
                </div>
              </>
            )}

            {/* K8s */}
            {selectedProvider === "k8s" && (
              <>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    RBAC Output (kubectl)
                  </label>
                  <textarea
                    value={config.k8sRbac}
                    onChange={(e) => updateConfig("k8sRbac", e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder="Paste kubectl auth can-i --list or kubectl get clusterrolebindings output"
                    spellCheck={false}
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Paste kubectl RBAC output to detect privilege escalation paths.
                  </p>
                </div>
                <div>
                  <label className="block text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                    Pod Security Spec (YAML)
                  </label>
                  <textarea
                    value={config.k8sPodSpec}
                    onChange={(e) => updateConfig("k8sPodSpec", e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--border-strong)] resize-none"
                    placeholder={"apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: app\n    securityContext:\n      privileged: true"}
                    spellCheck={false}
                  />
                  <p className="text-[8px] font-mono text-[var(--text-subtle)] mt-1">
                    Analyze pod specifications for security misconfigurations.
                  </p>
                </div>
                <div>
                  <label
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => updateConfig("k8sScanSecrets", !config.k8sScanSecrets)}
                  >
                    <div
                      className={cn(
                        "w-3.5 h-3.5 border flex items-center justify-center transition-colors",
                        config.k8sScanSecrets
                          ? "border-[var(--success)] bg-[var(--success)]"
                          : "border-[var(--border-strong)] group-hover:border-[var(--text-muted)]"
                      )}
                    >
                      {config.k8sScanSecrets && (
                        <CheckCircle className="w-2.5 h-2.5 text-black" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-white">
                        Scan for Exposed Secrets
                      </span>
                      <p className="text-[8px] font-mono text-[var(--text-subtle)]">
                        Check for secrets mounted as env vars, unencrypted secrets, and service account tokens.
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Launch */}
          <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <div className="text-[9px] font-mono text-[var(--text-subtle)]">
              Agent: <span className="text-white">CloudHunter</span> | Provider: <span className="text-white">{selectedProvider.toUpperCase()}</span>
            </div>
            <button
              onClick={handleLaunch}
              disabled={isPending || result?.status === "running"}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isPending || result?.status === "running" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Shield className="w-3 h-3" />
              )}
              {result?.status === "running" ? "Running..." : "Start Cloud Assessment"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="border border-[var(--border)]">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                Assessment Results
              </h2>
              <span
                className={cn(
                  "text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border",
                  result.status === "running"
                    ? "border-[var(--warning)] text-[var(--warning)]"
                    : result.status === "completed"
                      ? "border-[var(--success)] text-[var(--success)]"
                      : "border-[var(--danger)] text-[var(--danger)]"
                )}
              >
                {result.status}
              </span>
            </div>
            {result.status === "running" && (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--warning)]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Polling for findings...
              </div>
            )}
          </div>

          {/* Severity summary */}
          {result.findings.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-4">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
              </span>
              {(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                const count = severityCounts[sev] || 0;
                if (count === 0) return null;
                return (
                  <span
                    key={sev}
                    className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border"
                    style={{
                      borderColor: SEVERITY_COLORS[sev],
                      color: SEVERITY_COLORS[sev],
                      backgroundColor: SEVERITY_BG[sev],
                    }}
                  >
                    {count} {sev}
                  </span>
                );
              })}
            </div>
          )}

          {/* Findings list */}
          {result.findings.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-[var(--text-muted)]">
              {result.status === "running"
                ? "Waiting for findings..."
                : "No findings detected."}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {result.findings.map((f) => (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: SEVERITY_COLORS[f.severity] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-white font-bold">
                          {f.title}
                        </span>
                        <span
                          className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 border"
                          style={{
                            borderColor: SEVERITY_COLORS[f.severity],
                            color: SEVERITY_COLORS[f.severity],
                          }}
                        >
                          {f.severity}
                        </span>
                        {f.mitreAttack?.map((m) => (
                          <span
                            key={m}
                            className="text-[8px] font-mono px-1 py-0.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-subtle)]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      {f.description && (
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 leading-relaxed">
                          {f.description}
                        </p>
                      )}
                      {f.remediation && (
                        <div className="mt-2 px-3 py-2 border-l-2 border-[var(--success)] bg-[var(--success-dim)]">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--success)] block mb-0.5">
                            Remediation
                          </span>
                          <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                            {f.remediation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
