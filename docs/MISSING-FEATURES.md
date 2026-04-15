# BJHUNT ALPHA 1.0 — Missing Features & Implementation Status

## FAKE / HARDCODED DATA (must fix before demo)

| ID | Issue | File | Line | Fix |
|----|-------|------|------|-----|
| F1 | Tokens always 0/2M | dashboard/page.tsx | 99 | Add endpoint to sum tokens from agent_runs |
| F2 | Severity counts always 0 | dashboard/page.tsx | 100 | Query findings table GROUP BY severity |
| F3 | Scans/day always [0..0,N] | dashboard/page.tsx | 100 | Query engagements GROUP BY date |
| F4 | Plan always "Free" | dashboard/page.tsx | 101 | Read from org plan field |
| F5 | Admin sessions/online/logs24h = 0 | dashboard/page.tsx | 63 | Query sessions + audit_logs tables |
| F6 | Monitoring queue stats = 0 | monitoring/page.tsx | 22 | No queue exists — show agent_runs instead |
| F7 | Health checks reference wrong services | monitoring-dashboard.tsx | 63-68 | Map real health check keys |
| F8 | User block is fake (role=viewer) | user-actions-panel.tsx | 24 | Good enough for alpha |
| F9 | User online/lastLogin = null | admin/users/page.tsx | 35 | Query sessions for last login |

## MISSING BACKEND ENDPOINTS

| ID | Endpoint | Called by | Fix |
|----|----------|-----------|-----|
| M1 | `/api/admin/overview` | admin/settings/page.tsx | Redirect to /api/admin/settings |
| M2 | `/api/admin/platform-defaults` | platform-settings-form.tsx | Use PUT /api/admin/settings |
| M3 | `/api/admin/gateway/config` | gateway/[providerId]/page.tsx | Use GET /api/admin/settings |
| M4 | `/api/admin/gateway/providers/:id` | provider-edit-form.tsx | Use PUT /api/admin/settings |
| M5 | `/api/admin/gateway/providers/:id/test` | provider-edit-form.tsx | Add test endpoint |
| M6 | `/api/admin/queue-stats` | monitoring-dashboard.tsx | Return agent_runs stats |

## METHOD MISMATCH

| ID | Issue | Fix |
|----|-------|-----|
| X1 | change-password sends PATCH, backend expects POST | Change frontend to POST |

## AUDIT LOG BUGS

| ID | Issue | Fix |
|----|-------|-----|
| A1 | Admin user create uses `metadata` column (should be `details`) | Fix column name |
| A2 | Admin user update/delete have no audit logs | Add audit log inserts |

## DB TABLES WITHOUT WRITE PATH

| Table | Issue | Fix |
|-------|-------|-----|
| findings | No POST endpoint | Add POST /api/engagements/:id/findings |
| notifications | No organic creation | Create notifications on finding/engagement events |
| password_reset_tokens | Token created but email never sent | Integrate email service |

## MISSING FEATURES (deferred to later versions)

| Feature | Priority | Status |
|---------|----------|--------|
| Billing / Stripe | P2 | Not started |
| Email verification | P2 | Schema ready, no flow |
| 2FA / TOTP | P3 | Not started |
| PDF report export | P2 | Not started |
| Webhook system | P3 | Not started |
| SSO / SAML | P3 | Not started |
| Job queue (BullMQ) | P2 | Not started |
