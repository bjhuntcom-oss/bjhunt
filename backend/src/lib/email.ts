/**
 * Email service — sends transactional emails via Resend.
 * Falls back to console logging in dev mode when no API key is configured.
 */

import { Resend } from "resend";
import { config } from "../config.js";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (resendClient) return resendClient;
  if (config.email.resendApiKey) {
    resendClient = new Resend(config.email.resendApiKey);
    return resendClient;
  }
  return null;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 * If RESEND_API_KEY is not set, logs the email to console in dev mode.
 * Returns true if sent (or logged), false on error.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getClient();

  if (!client) {
    if (!config.isProduction) {
      console.log("[DEV EMAIL] ─────────────────────────────────────────");
      console.log(`  To:      ${params.to}`);
      console.log(`  Subject: ${params.subject}`);
      console.log(`  HTML:    (${params.html.length} chars)`);
      console.log("────────────────────────────────────────────────────");
    }
    return true;
  }

  try {
    const { error } = await client.emails.send({
      from: config.email.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    if (error) {
      console.error("[EMAIL] Failed to send:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[EMAIL] Exception sending email:", err);
    return false;
  }
}
