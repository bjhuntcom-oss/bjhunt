// app/[locale]/dashboard/layout.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { serverBackendFetch } from "@/lib/backend-client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";

  if (!cookieHeader) {
    redirect(`/${locale}/login`);
  }

  const meResponse = await serverBackendFetch("/api/auth/me", {}, cookieHeader);
  if (!meResponse.ok) {
    redirect(`/${locale}/login`);
  }

  const { user } = (await meResponse.json()) as {
    user: { displayName: string; email: string; role: string } | null;
  };

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <DashboardShell user={user} locale={locale}>
      {children}
    </DashboardShell>
  );
}
