/**
 * Email templates — brutalist dark theme matching BJHUNT branding.
 * All templates return { subject, html } for use with sendEmail().
 */

import { config } from "../config.js";

// ── Base layout ─────────────────────────────────────────────────────────────

function layout(preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>BJHUNT</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'JetBrains Mono',monospace;color:#e0e0e0;">
<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#111111;border:1px solid #222222;">
    <!-- Logo -->
    <tr><td style="padding:32px 40px 24px 40px;border-bottom:1px solid #222222;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:2px;">
          BJHUNT
        </td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#666666;padding-left:12px;vertical-align:bottom;padding-bottom:2px;">
          ALPHA 1.0
        </td>
      </tr></table>
    </td></tr>
    <!-- Content -->
    <tr><td style="padding:32px 40px;">
      ${content}
    </td></tr>
    <!-- Footer -->
    <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #222222;">
      <p style="margin:0 0 8px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#555555;line-height:1.6;">
        BJHUNT ALPHA 1.0 &mdash; AI-Powered Cybersecurity
      </p>
      <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#444444;line-height:1.6;">
        <a href="${config.email.appUrl}/settings/notifications" style="color:#444444;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&bull;&nbsp;
        <a href="${config.email.appUrl}/legal/privacy" style="color:#444444;text-decoration:underline;">Privacy</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 24px 0;font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-family:'JetBrains Mono',monospace;font-size:14px;color:#cccccc;line-height:1.7;">${text}</p>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
    <td style="background-color:#ffffff;padding:14px 32px;">
      <a href="${url}" style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;letter-spacing:1px;">${label}</a>
    </td>
  </tr></table>`;
}

function codeBlock(text: string): string {
  return `<div style="margin:24px 0;padding:20px;background-color:#0a0a0a;border:1px solid #333333;font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:8px;">${text}</div>`;
}

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#666666;border-bottom:1px solid #1a1a1a;">${label}</td>
    <td style="padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#cccccc;border-bottom:1px solid #1a1a1a;">${value}</td>
  </tr>`;
}

// ── Templates ───────────────────────────────────────────────────────────────

export function welcomeEmail(name: string): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: "Welcome to BJHUNT",
    html: layout(
      "Your BJHUNT account is ready. Start your first security assessment.",
      `${heading("Welcome, " + escapeHtml(displayName))}
      ${paragraph("Your BJHUNT account has been created. You now have access to autonomous AI-powered security assessments.")}
      ${paragraph("Here is what you can do next:")}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
        ${metaRow("01", "Configure your first engagement target")}
        ${metaRow("02", "Launch an autonomous security assessment")}
        ${metaRow("03", "Review findings in real-time")}
        ${metaRow("04", "Generate API keys for CI/CD integration")}
      </table>
      ${button("OPEN DASHBOARD", config.email.appUrl + "/dashboard")}
      ${paragraph("If you did not create this account, ignore this email or contact support.")}`
    ),
  };
}

export function passwordResetEmail(name: string, resetUrl: string): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: "BJHUNT — Password Reset",
    html: layout(
      "Reset your BJHUNT password. This link expires in 1 hour.",
      `${heading("Password Reset")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph("A password reset was requested for your BJHUNT account. Click the button below to set a new password. This link expires in 1 hour.")}
      ${button("RESET PASSWORD", resetUrl)}
      ${paragraph("Or copy this URL into your browser:")}
      <p style="margin:0 0 16px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#888888;word-break:break-all;line-height:1.7;">${escapeHtml(resetUrl)}</p>
      ${paragraph("If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.")}`
    ),
  };
}

export function verifyEmailEmail(
  name: string,
  verifyUrl: string,
): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: "BJHUNT — Verify your email",
    html: layout(
      "Confirm your BJHUNT account by verifying your email address.",
      `${heading("Verify your email")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph("Welcome to BJHUNT. Please click the button below to verify your email address. This link expires in 24 hours.")}
      ${button("VERIFY EMAIL", verifyUrl)}
      ${paragraph("Or copy this URL into your browser:")}
      <p style="margin:0 0 16px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#888888;word-break:break-all;line-height:1.7;">${escapeHtml(verifyUrl)}</p>
      ${paragraph("If you did not create a BJHUNT account, ignore this email — no account will be activated.")}`
    ),
  };
}

export function otpEmail(name: string, code: string): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: `BJHUNT — Verification Code: ${code}`,
    html: layout(
      `Your BJHUNT verification code is ${code}. It expires in 10 minutes.`,
      `${heading("Verification Code")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph("Use the following code to complete your login:")}
      ${codeBlock(escapeHtml(code))}
      ${paragraph("This code expires in 10 minutes. Do not share it with anyone.")}
      ${paragraph("If you did not attempt to log in, change your password immediately.")}`
    ),
  };
}

export function loginNotificationEmail(
  name: string,
  ip: string,
  userAgent: string,
  time: string
): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: "BJHUNT — New Login Detected",
    html: layout(
      "A new login to your BJHUNT account was detected.",
      `${heading("New Login Detected")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph("A new login to your account was detected with the following details:")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #222222;">
        ${metaRow("IP Address", escapeHtml(ip))}
        ${metaRow("Device", escapeHtml(truncate(userAgent, 80)))}
        ${metaRow("Time (UTC)", escapeHtml(time))}
      </table>
      ${paragraph("If this was you, no action is needed.")}
      ${paragraph("If you do not recognize this login, change your password immediately and review your active sessions.")}
      ${button("REVIEW SESSIONS", config.email.appUrl + "/dashboard/settings")}`
    ),
  };
}

export function engagementCompleteEmail(
  name: string,
  engagementName: string,
  findingsCount: number,
  criticalCount: number
): { subject: string; html: string } {
  const displayName = name || "Operator";
  const criticalLabel = criticalCount > 0
    ? `<span style="color:#ff4444;font-weight:700;">${criticalCount} CRITICAL</span>`
    : `<span style="color:#44ff44;">0 critical</span>`;

  return {
    subject: `BJHUNT — Assessment Complete: ${engagementName}`,
    html: layout(
      `Assessment "${engagementName}" is complete. ${findingsCount} findings, ${criticalCount} critical.`,
      `${heading("Assessment Complete")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph('The security assessment <strong style="color:#ffffff;">' + escapeHtml(engagementName) + '</strong> has finished.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #222222;">
        ${metaRow("Engagement", escapeHtml(engagementName))}
        ${metaRow("Total Findings", String(findingsCount))}
        ${metaRow("Critical", criticalLabel)}
        ${metaRow("Status", "COMPLETE")}
      </table>
      ${button("VIEW REPORT", config.email.appUrl + "/dashboard/audits")}
      ${paragraph("Review your findings and download the full report from your dashboard.")}`
    ),
  };
}

export function apiKeyCreatedEmail(
  name: string,
  keyName: string,
  keyPrefix: string
): { subject: string; html: string } {
  const displayName = name || "Operator";
  return {
    subject: "BJHUNT — API Key Created",
    html: layout(
      `A new API key "${keyName}" (${keyPrefix}...) was created on your account.`,
      `${heading("API Key Created")}
      ${paragraph("Hello " + escapeHtml(displayName) + ",")}
      ${paragraph("A new API key was created on your account:")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #222222;">
        ${metaRow("Key Name", escapeHtml(keyName))}
        ${metaRow("Prefix", escapeHtml(keyPrefix) + "...")}
      </table>
      ${paragraph("If you did not create this key, revoke it immediately from your dashboard.")}
      ${button("MANAGE API KEYS", config.email.appUrl + "/dashboard/settings")}
      ${paragraph("Never share your API key. Store it securely and rotate it periodically.")}`
    ),
  };
}

// ── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
