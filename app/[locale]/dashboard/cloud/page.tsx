"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams } from "next/navigation";
import { browserBackendFetch } from "@/lib/backend-client";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { usePlan } from "@/lib/use-plan";
import { PageHero, Eyebrow, StatusDot } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  Server,
  Database,
  Shield,
  HardDrive,
  Loader2,
  ChevronRight,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

type CloudProvider = "aws" | "azure" | "gcp" | "k8s";

interface CloudConfig {
  provider: CloudProvider;
  awsIamPolicy: string;
  awsS3Bucket: string;
  awsEc2Target: string;
  awsCredentialScope: string;
  azureRbac: string;
  azureStorageAccount: string;
  azureManagedIdentity: boolean;
  gcpIamPolicy: string;
  gcpBucket: string;
  gcpMetadataInstance: string;
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

// ── Tokens ──────────────────────────────────────────────────────────────

const SEVERITY_TONE: Record<string, "critical" | "warning" | "success" | "neutral"> = {
  critical: "critical",
  high: "critical",
  medium: "warning",
  low: "success",
  info: "neutral",
};

const TONE_COLORS = {
  critical: "var(--bjhunt-status-danger, #fb565b)",
  warning: "var(--bjhunt-status-warning, #ffba00)",
  success: "var(--bjhunt-status-success, #00d992)",
  neutral: "var(--bjhunt-text-muted, #8b949e)",
};

const TONE_BG = {
  critical: "var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))",
  warning: "var(--bjhunt-severity-medium-bg, rgba(255,186,0,0.12))",
  success: "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))",
  neutral: "transparent",
};

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
  borderColor: "var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius-md, 8px)",
};

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: "var(--bjhunt-font-mono)",
  fontSize: 13,
  color: "var(--bjhunt-text)",
  background: "var(--bjhunt-bg, #050507)",
  border: "1px solid var(--bjhunt-border, #3d3a39)",
  borderRadius: "var(--bjhunt-radius, 6px)",
  padding: "8px 12px",
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--bjhunt-font-sans)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--bjhunt-text)",
};

const HINT_STYLE: React.CSSProperties = {
  fontFamily: "var(--bjhunt-font-sans)",
  fontSize: 13,
  color: "var(--bjhunt-text-muted)",
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
  const { plan } = usePlan();
  const params = useParams();
  const isFr = ((params?.locale as string) || "fr") === "fr";
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
  const [pollError, setPollError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const updateConfig = useCallback(
    <K extends keyof CloudConfig>(key: K, value: CloudConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleLaunch = () => {
    if (!selectedProvider) return;

    const jsonChecks: Array<{ value: string; field: string }> = [];
    if (selectedProvider === "aws") {
      jsonChecks.push({ value: config.awsIamPolicy, field: "AWS IAM Policy" });
    } else if (selectedProvider === "azure") {
      jsonChecks.push({ value: config.azureRbac, field: "Azure RBAC" });
    } else if (selectedProvider === "gcp") {
      jsonChecks.push({ value: config.gcpIamPolicy, field: "GCP IAM Policy" });
    } else if (selectedProvider === "k8s") {
      jsonChecks.push({ value: config.k8sRbac, field: "K8s RBAC" });
      jsonChecks.push({ value: config.k8sPodSpec, field: "K8s Pod Spec" });
    }
    for (const { value, field } of jsonChecks) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      try {
        JSON.parse(trimmed);
      } catch (err) {
        setLaunchError(
          isFr
            ? `Le champ ${field} n'est pas du JSON valide : ${err instanceof Error ? err.message : "parse error"}`
            : `${field} is not valid JSON: ${err instanceof Error ? err.message : "parse error"}`
        );
        return;
      }
    }

    startTransition(async () => {
      const providerConfig: Record<string, unknown> = { provider: selectedProvider };

      switch (selectedProvider) {
        case "aws":
          if (config.awsIamPolicy.trim()) providerConfig.iamPolicy = config.awsIamPolicy;
          if (config.awsS3Bucket.trim()) providerConfig.s3Bucket = config.awsS3Bucket;
          if (config.awsEc2Target.trim()) providerConfig.ec2Target = config.awsEc2Target;
          if (config.awsCredentialScope.trim())
            providerConfig.credentialScope = config.awsCredentialScope;
          break;
        case "azure":
          if (config.azureRbac.trim()) providerConfig.rbacAssignments = config.azureRbac;
          if (config.azureStorageAccount.trim())
            providerConfig.storageAccount = config.azureStorageAccount;
          providerConfig.checkManagedIdentity = config.azureManagedIdentity;
          break;
        case "gcp":
          if (config.gcpIamPolicy.trim()) providerConfig.iamPolicy = config.gcpIamPolicy;
          if (config.gcpBucket.trim()) providerConfig.gcsBucket = config.gcpBucket;
          if (config.gcpMetadataInstance.trim())
            providerConfig.metadataInstance = config.gcpMetadataInstance;
          break;
        case "k8s":
          if (config.k8sRbac.trim()) providerConfig.rbacOutput = config.k8sRbac;
          if (config.k8sPodSpec.trim()) providerConfig.podSpec = config.k8sPodSpec;
          providerConfig.scanSecrets = config.k8sScanSecrets;
          break;
      }

      const targetName = `Cloud Scan - ${selectedProvider.toUpperCase()}`;
      const target =
        selectedProvider === "aws"
          ? config.awsS3Bucket || config.awsEc2Target || "aws-environment"
          : selectedProvider === "azure"
            ? config.azureStorageAccount || "azure-environment"
            : selectedProvider === "gcp"
              ? config.gcpBucket || "gcp-environment"
              : "k8s-cluster";

      try {
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

        await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, {
          method: "POST",
        });

        setResult({
          engagementId: engagement.id,
          status: "running",
          findings: [],
        });

        let consecutiveFailures = 0;
        const interval = setInterval(async () => {
          try {
            const findingsRes = await browserBackendFetch(
              `/api/engagements/${engagement.id}/findings`
            );
            if (findingsRes.ok) {
              const { findings } = await findingsRes.json();
              setResult((prev) => (prev ? { ...prev, findings: findings || [] } : prev));
            } else if (findingsRes.status >= 500) {
              throw new Error(`Findings poll: HTTP ${findingsRes.status}`);
            }

            const engRes = await browserBackendFetch(`/api/engagements/${engagement.id}`);
            if (engRes.ok) {
              const { engagement: eng } = await engRes.json();
              if (
                eng.status === "completed" ||
                eng.status === "failed" ||
                eng.status === "cancelled"
              ) {
                setResult((prev) => (prev ? { ...prev, status: eng.status } : prev));
                clearInterval(interval);
                setPollInterval(null);
              }
            }
            consecutiveFailures = 0;
            setPollError(null);
          } catch (err) {
            consecutiveFailures += 1;
            console.error("[cloud-scan] poll failure", err);
            if (consecutiveFailures >= 3) {
              setPollError(
                "Connection to scan poller lost — results may be stale. Refresh the page if this persists."
              );
            }
          }
        }, 5000);

        setPollInterval(interval);
      } catch (err) {
        console.error("[cloud-scan] launch failed", err);
        setLaunchError(
          err instanceof Error ? err.message : "Failed to launch cloud scan. Please retry."
        );
      }
    });
  };

  const severityCounts =
    result?.findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

  return (
    <PlanGate
      requiredPlan="enterprise"
      currentPlan={plan}
      featureName="Cloud Security Assessment"
    >
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1280px] mx-auto">
        <PageHero
          eyebrow="07 / CLOUD"
          title={isFr ? "Audit Cloud" : "Cloud Security Scan"}
          lede={
            isFr
              ? "Agent CloudHunter — AWS IAM privesc, S3 takeover, K8s RBAC, secrets Terraform."
              : "CloudHunter agent — AWS IAM privesc, S3 takeover, K8s RBAC, Terraform secrets."
          }
        />

        {(launchError || pollError) && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 flex items-center justify-between gap-3"
            style={{
              border: "1px solid var(--bjhunt-status-danger, #fb565b)",
              background: "var(--bjhunt-severity-critical-bg, rgba(255,69,58,0.12))",
              color: "var(--bjhunt-status-danger, #fb565b)",
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13,
              borderRadius: "var(--bjhunt-radius, 6px)",
            }}
          >
            <span>{launchError ?? pollError}</span>
            <button
              type="button"
              onClick={() => {
                setLaunchError(null);
                setPollError(null);
              }}
              aria-label="Dismiss"
              style={{ color: "currentColor" }}
            >
              ×
            </button>
          </div>
        )}

        {/* Provider selector */}
        <section className="mb-8">
          <div className="mb-3">
            <Eyebrow>{isFr ? "Selectionnez un fournisseur" : "Select Cloud Provider"}</Eyebrow>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  className="border p-4 text-left transition-colors group"
                  style={{
                    background: "var(--bjhunt-bg-secondary, var(--surface, #101010))",
                    borderColor: isSelected
                      ? "var(--bjhunt-status-success, #00d992)"
                      : "var(--bjhunt-border, #3d3a39)",
                    borderWidth: isSelected ? 2 : 1,
                    borderRadius: "var(--bjhunt-radius-md, 8px)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      className="w-5 h-5"
                      style={{
                        color: isSelected
                          ? "var(--bjhunt-status-success, #00d992)"
                          : "var(--bjhunt-text-muted)",
                      }}
                    />
                    <h3
                      className="m-0"
                      style={{
                        fontFamily: "var(--bjhunt-font-sans)",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "var(--bjhunt-text)",
                      }}
                    >
                      {p.name}
                    </h3>
                  </div>
                  <p
                    className="mb-3"
                    style={{
                      fontFamily: "var(--bjhunt-font-sans)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {p.label}
                  </p>
                  <ul className="space-y-1">
                    {p.surfaces.map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <ChevronRight
                          className="w-3 h-3 shrink-0"
                          style={{ color: "var(--bjhunt-text-muted)" }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--bjhunt-font-sans)",
                            fontSize: 13,
                            color: "var(--bjhunt-text)",
                          }}
                        >
                          {s}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </section>

        {/* Provider form */}
        {selectedProvider && (
          <section className="mb-8">
            <div className="mb-3">
              <Eyebrow>
                {PROVIDERS.find((p) => p.id === selectedProvider)?.name} Configuration
              </Eyebrow>
            </div>
            <div className="border" style={CARD_STYLE}>
              <div
                className="p-6 space-y-5 border-b"
                style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
              >
                {/* AWS */}
                {selectedProvider === "aws" && (
                  <>
                    <Field label="IAM Policy JSON" hint="Paste an IAM policy to analyze for privilege escalation paths.">
                      <textarea
                        value={config.awsIamPolicy}
                        onChange={(e) => updateConfig("awsIamPolicy", e.target.value)}
                        rows={6}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Resource":"*"}]}'
                        spellCheck={false}
                      />
                    </Field>
                    <Field label="S3 Bucket Name or Domain" hint="Check for public access, ACL misconfigurations, and bucket policy issues.">
                      <input
                        value={config.awsS3Bucket}
                        onChange={(e) => updateConfig("awsS3Bucket", e.target.value)}
                        style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                        placeholder="my-company-backups.s3.amazonaws.com"
                      />
                    </Field>
                    <Field label="EC2 Metadata Target" hint="Check for IMDS v1/v2 exposure and SSRF-to-credential paths.">
                      <input
                        value={config.awsEc2Target}
                        onChange={(e) => updateConfig("awsEc2Target", e.target.value)}
                        style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                        placeholder="10.0.1.50 or ssrf-vulnerable.example.com"
                      />
                    </Field>
                    <Field label="Credential Scope">
                      <textarea
                        value={config.awsCredentialScope}
                        onChange={(e) => updateConfig("awsCredentialScope", e.target.value)}
                        rows={3}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder="Access Key ID, account ID, or role ARN for scope context"
                      />
                    </Field>
                  </>
                )}

                {/* Azure */}
                {selectedProvider === "azure" && (
                  <>
                    <Field label="RBAC Role Assignments JSON" hint="Paste az role assignment list output to analyze for privilege escalation.">
                      <textarea
                        value={config.azureRbac}
                        onChange={(e) => updateConfig("azureRbac", e.target.value)}
                        rows={6}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder='[{"principalId":"...","roleDefinitionName":"Contributor","scope":"/subscriptions/..."}]'
                        spellCheck={false}
                      />
                    </Field>
                    <Field label="Storage Account Name" hint="Check for anonymous access, shared access signatures, and key exposure.">
                      <input
                        value={config.azureStorageAccount}
                        onChange={(e) => updateConfig("azureStorageAccount", e.target.value)}
                        style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                        placeholder="mystorageaccount"
                      />
                    </Field>
                    <CheckboxRow
                      label="Check Managed Identity Exposure"
                      hint="Probe for IMDS-based managed identity token theft from compromised VMs."
                      checked={config.azureManagedIdentity}
                      onToggle={() =>
                        updateConfig("azureManagedIdentity", !config.azureManagedIdentity)
                      }
                    />
                  </>
                )}

                {/* GCP */}
                {selectedProvider === "gcp" && (
                  <>
                    <Field label="GCP IAM Policy JSON" hint="Paste gcloud projects get-iam-policy output to analyze for escalation.">
                      <textarea
                        value={config.gcpIamPolicy}
                        onChange={(e) => updateConfig("gcpIamPolicy", e.target.value)}
                        rows={6}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder='{"bindings":[{"role":"roles/owner","members":["user:admin@example.com"]}]}'
                        spellCheck={false}
                      />
                    </Field>
                    <Field label="GCS Bucket Name" hint="Check for public access, uniform bucket-level access, and ACL issues.">
                      <input
                        value={config.gcpBucket}
                        onChange={(e) => updateConfig("gcpBucket", e.target.value)}
                        style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                        placeholder="my-company-data"
                      />
                    </Field>
                    <Field label="Metadata Instance" hint="Check for metadata API access and service account token exposure.">
                      <input
                        value={config.gcpMetadataInstance}
                        onChange={(e) => updateConfig("gcpMetadataInstance", e.target.value)}
                        style={{ ...INPUT_STYLE, width: "100%", height: 40 }}
                        placeholder="10.128.0.5 or ssrf-target.example.com"
                      />
                    </Field>
                  </>
                )}

                {/* K8s */}
                {selectedProvider === "k8s" && (
                  <>
                    <Field label="RBAC Output (kubectl)" hint="Paste kubectl RBAC output to detect privilege escalation paths.">
                      <textarea
                        value={config.k8sRbac}
                        onChange={(e) => updateConfig("k8sRbac", e.target.value)}
                        rows={6}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder="Paste kubectl auth can-i --list or kubectl get clusterrolebindings output"
                        spellCheck={false}
                      />
                    </Field>
                    <Field label="Pod Security Spec (YAML)" hint="Analyze pod specifications for security misconfigurations.">
                      <textarea
                        value={config.k8sPodSpec}
                        onChange={(e) => updateConfig("k8sPodSpec", e.target.value)}
                        rows={6}
                        style={{ ...INPUT_STYLE, width: "100%", resize: "vertical" }}
                        placeholder={
                          "apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: app\n    securityContext:\n      privileged: true"
                        }
                        spellCheck={false}
                      />
                    </Field>
                    <CheckboxRow
                      label="Scan for Exposed Secrets"
                      hint="Check for secrets mounted as env vars, unencrypted secrets, and service account tokens."
                      checked={config.k8sScanSecrets}
                      onToggle={() =>
                        updateConfig("k8sScanSecrets", !config.k8sScanSecrets)
                      }
                    />
                  </>
                )}
              </div>

              <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <p
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                    margin: 0,
                  }}
                >
                  Agent: <span style={{ color: "var(--bjhunt-text)" }}>CloudHunter</span> ·
                  Provider:{" "}
                  <span style={{ color: "var(--bjhunt-text)" }}>
                    {selectedProvider.toUpperCase()}
                  </span>
                </p>
                <Button
                  variant="success"
                  size="md"
                  onClick={handleLaunch}
                  disabled={isPending || result?.status === "running"}
                >
                  {isPending || result?.status === "running" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-3 h-3 mr-2" />
                  )}
                  {result?.status === "running"
                    ? isFr
                      ? "Scan en cours..."
                      : "Running..."
                    : isFr
                      ? "Lancer le scan"
                      : "Start Cloud Scan"}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {result && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <Eyebrow>{isFr ? "Resultats" : "Scan Results"}</Eyebrow>
              <StatusDot
                state={
                  result.status === "completed"
                    ? "success"
                    : result.status === "running"
                      ? "warning"
                      : "critical"
                }
                label={
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color:
                        result.status === "completed"
                          ? "var(--bjhunt-status-success, #00d992)"
                          : result.status === "running"
                            ? "var(--bjhunt-status-warning, #ffba00)"
                            : "var(--bjhunt-status-danger, #fb565b)",
                    }}
                  >
                    {result.status}
                  </span>
                }
                pulse={result.status === "running"}
              />
              {result.status === "running" && (
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 13,
                    color: "var(--bjhunt-status-warning, #ffba00)",
                  }}
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Polling for findings...
                </span>
              )}
            </div>

            <div className="border" style={CARD_STYLE}>
              {result.findings.length > 0 && (
                <div
                  className="px-6 py-4 flex items-center gap-3 flex-wrap border-b"
                  style={{ borderColor: "var(--bjhunt-border, #3d3a39)" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""}
                  </span>
                  {(["critical", "high", "medium", "low", "info"] as const).map((sev) => {
                    const count = severityCounts[sev] || 0;
                    if (count === 0) return null;
                    const tone = SEVERITY_TONE[sev];
                    return (
                      <span
                        key={sev}
                        className="inline-flex items-center"
                        style={{
                          fontFamily: "var(--bjhunt-font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: TONE_COLORS[tone],
                          background: TONE_BG[tone],
                          border: `1px solid ${TONE_COLORS[tone]}`,
                          borderRadius: "var(--bjhunt-radius-sm, 4px)",
                          padding: "2px 6px",
                        }}
                      >
                        {count} {sev}
                      </span>
                    );
                  })}
                </div>
              )}

              {result.findings.length === 0 ? (
                <div
                  className="px-6 py-12 text-center"
                  style={{
                    fontFamily: "var(--bjhunt-font-sans)",
                    fontSize: 14,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {result.status === "running"
                    ? "Waiting for findings..."
                    : "No findings detected."}
                </div>
              ) : (
                <div>
                  {result.findings.map((f, idx) => {
                    const tone = SEVERITY_TONE[f.severity];
                    return (
                      <div
                        key={f.id}
                        className="px-6 py-4"
                        style={{
                          borderTop:
                            idx === 0
                              ? "none"
                              : "1px solid var(--bjhunt-border, #3d3a39)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="shrink-0 mt-2"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "var(--bjhunt-radius-pill, 9999px)",
                              background: TONE_COLORS[tone],
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className="m-0"
                                style={{
                                  fontFamily: "var(--bjhunt-font-sans)",
                                  fontWeight: 600,
                                  fontSize: 14,
                                  color: "var(--bjhunt-text)",
                                }}
                              >
                                {f.title}
                              </h4>
                              <span
                                style={{
                                  fontFamily: "var(--bjhunt-font-mono)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  letterSpacing: "0.18em",
                                  textTransform: "uppercase",
                                  color: TONE_COLORS[tone],
                                  border: `1px solid ${TONE_COLORS[tone]}`,
                                  borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                  padding: "1px 5px",
                                }}
                              >
                                {f.severity}
                              </span>
                              {f.mitreAttack?.map((m) => (
                                <span
                                  key={m}
                                  style={{
                                    fontFamily: "var(--bjhunt-font-mono)",
                                    fontSize: 11,
                                    color: "var(--bjhunt-text-muted)",
                                    border: "1px solid var(--bjhunt-border, #3d3a39)",
                                    borderRadius: "var(--bjhunt-radius-sm, 4px)",
                                    padding: "1px 5px",
                                  }}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                            {f.description && (
                              <p
                                className="mt-1"
                                style={{
                                  fontFamily: "var(--bjhunt-font-sans)",
                                  fontSize: 13,
                                  lineHeight: 1.5,
                                  color: "var(--bjhunt-text-muted)",
                                  margin: 0,
                                }}
                              >
                                {f.description}
                              </p>
                            )}
                            {f.remediation && (
                              <div
                                className="mt-2 px-3 py-2"
                                style={{
                                  borderLeft:
                                    "2px solid var(--bjhunt-status-success, #00d992)",
                                  background:
                                    "var(--bjhunt-severity-low-bg, rgba(0,217,146,0.12))",
                                  borderRadius:
                                    "0 var(--bjhunt-radius, 6px) var(--bjhunt-radius, 6px) 0",
                                }}
                              >
                                <Eyebrow>Remediation</Eyebrow>
                                <p
                                  className="mt-1"
                                  style={{
                                    fontFamily: "var(--bjhunt-font-sans)",
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: "var(--bjhunt-text)",
                                    margin: 0,
                                  }}
                                >
                                  {f.remediation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </PlanGate>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-2" style={LABEL_STYLE}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-2" style={HINT_STYLE}>
          {hint}
        </p>
      )}
    </div>
  );
}

function CheckboxRow({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-start gap-3 text-left w-full"
    >
      <span
        aria-hidden
        className={cn("inline-flex items-center justify-center shrink-0")}
        style={{
          width: 16,
          height: 16,
          marginTop: 2,
          border: `1px solid ${
            checked ? "var(--bjhunt-status-success, #00d992)" : "var(--bjhunt-border-strong, #5a5654)"
          }`,
          background: checked ? "var(--bjhunt-status-success, #00d992)" : "transparent",
          borderRadius: "var(--bjhunt-radius-sm, 4px)",
        }}
      >
        {checked && <CheckCircle className="w-2.5 h-2.5" style={{ color: "#000" }} />}
      </span>
      <div className="min-w-0">
        <p
          style={{
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--bjhunt-text)",
            margin: 0,
          }}
        >
          {label}
        </p>
        {hint && (
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: 13,
              color: "var(--bjhunt-text-muted)",
              margin: 0,
            }}
          >
            {hint}
          </p>
        )}
      </div>
    </button>
  );
}
