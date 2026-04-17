/**
 * URL validator — blocks SSRF targets for admin-triggered outbound requests.
 *
 * Context (Finding #3-37 / C-15): the admin gateway `test` endpoint used to
 * fetch an attacker-controlled `baseUrl`, enabling probes of AWS IMDS
 * (169.254.169.254), loopback (127.0.0.1, localhost), RFC1918 LANs, etc.
 * This helper centralises the "is this URL safe to fetch from a privileged
 * backend?" check so every admin-side outbound HTTP call can reuse it.
 *
 * Policy (deny-by-default):
 *   - scheme must be http or https (no file:, gopher:, ftp:, data:, etc.)
 *   - hostname must not be an IP in a private / link-local / loopback /
 *     unspecified / CGNAT / multicast range (IPv4 or IPv6)
 *   - hostname must not be `localhost`, end in `.local`, or look like a
 *     cloud metadata alias (`metadata.*`, `instance-data.*`,
 *     `metadata.google.internal`, `metadata.azure.com`, etc.)
 *
 * Note: this function validates the *hostname as written* in the URL. It
 * does NOT resolve DNS — a malicious DNS record could still point a public
 * hostname at a private IP (DNS rebinding). Callers should additionally
 * pass `redirect: "manual"` and re-check any Location header. For the
 * strongest guarantee, constrain outbound egress at the container network
 * layer (sandbox-net in docker-compose).
 */

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// Hostname substrings / exact matches that are never acceptable as targets.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".lan",
  ".home.arpa",
];

const BLOCKED_HOSTNAME_PREFIXES = [
  "metadata.",
  "instance-data.",
];

// Exact cloud-metadata hostnames seen in the wild.
const CLOUD_METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata.azure.com",
  "metadata.packet.net",
  "rancher-metadata",
  "169.254.169.254",
  "fd00:ec2::254",
]);

/**
 * Parse a dotted-quad IPv4 string into 4 octets, or null if not IPv4.
 */
function parseIPv4(host: string): [number, number, number, number] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as [
    number,
    number,
    number,
    number,
  ];
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return parts;
}

/**
 * True if the 4-octet IPv4 address is in any disallowed range.
 */
function isPrivateIPv4(parts: [number, number, number, number]): boolean {
  const [a, b] = parts;
  if (a === 0) return true;                       // 0.0.0.0/8   — unspecified
  if (a === 10) return true;                      // 10/8        — RFC1918
  if (a === 127) return true;                     // 127/8       — loopback
  if (a === 169 && b === 254) return true;        // 169.254/16  — link-local (includes AWS IMDS)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 — RFC1918
  if (a === 192 && b === 168) return true;        // 192.168/16  — RFC1918
  if (a === 192 && b === 0) return true;          // 192.0.0/24 + 192.0.2/24 — IETF / TEST-NET
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 — benchmark
  if (a === 198 && b === 51) return true;         // 198.51.100/24 — TEST-NET-2
  if (a === 203 && b === 0) return true;          // 203.0.113/24 — TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 — CGNAT
  if (a >= 224) return true;                      // 224/4 + 240/4 — multicast + reserved
  return false;
}

/**
 * Strip IPv6 brackets, zone id, and normalise to lowercase.
 */
function normalizeIPv6(host: string): string {
  let h = host;
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  const pct = h.indexOf("%");
  if (pct >= 0) h = h.slice(0, pct);
  return h.toLowerCase();
}

/**
 * True if the input is a textual IPv6 address in a disallowed range.
 * Accepts colon-containing strings; does not validate every syntactic
 * corner case — anything remotely IPv6-shaped that lives in a blocked
 * range is rejected.
 */
function isPrivateIPv6(host: string): boolean {
  if (!host.includes(":")) return false;
  const h = normalizeIPv6(host);

  // ::1 loopback and :: unspecified
  if (h === "::1" || h === "::") return true;

  // IPv4-mapped (::ffff:a.b.c.d) — recurse on the embedded v4.
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const v4 = parseIPv4(mapped[1] ?? "");
    return v4 ? isPrivateIPv4(v4) : true;
  }

  // fc00::/7 — unique local
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;
  // fe80::/10 — link-local
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  // ff00::/8 — multicast
  if (/^ff[0-9a-f]{2}:/.test(h)) return true;

  return false;
}

/**
 * Check a URL. Returns `{ ok: true }` only if the hostname is a public
 * destination reachable over http(s). Anything else comes back with a
 * `reason` suitable for surfacing to the admin UI.
 */
export function isPublicHttpsUrl(input: string): ValidationResult {
  if (typeof input !== "string" || input.length === 0) {
    return { ok: false, reason: "empty URL" };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "malformed URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: `unsupported protocol ${url.protocol}` };
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) {
    return { ok: false, reason: "empty hostname" };
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || CLOUD_METADATA_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: `blocked hostname ${hostname}` };
  }

  for (const suf of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suf)) {
      return { ok: false, reason: `blocked hostname suffix ${suf}` };
    }
  }

  for (const pre of BLOCKED_HOSTNAME_PREFIXES) {
    if (hostname.startsWith(pre)) {
      return { ok: false, reason: `blocked hostname prefix ${pre}` };
    }
  }

  const v4 = parseIPv4(hostname);
  if (v4) {
    if (isPrivateIPv4(v4)) {
      return { ok: false, reason: `private/reserved IPv4 ${hostname}` };
    }
    return { ok: true };
  }

  // IPv6 literal — URL.hostname wraps them in brackets when parsed with new URL().
  // url.hostname returns without brackets, so detect via colons.
  if (hostname.includes(":")) {
    if (isPrivateIPv6(hostname)) {
      return { ok: false, reason: `private/reserved IPv6 ${hostname}` };
    }
    return { ok: true };
  }

  // Plain hostname — must be at least two dotted labels to avoid bare
  // single-label names (which resolve via /etc/hosts search, often to
  // internal services).
  if (!hostname.includes(".")) {
    return { ok: false, reason: "single-label hostname not allowed" };
  }

  return { ok: true };
}
