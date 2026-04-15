import { redirect } from 'next/navigation'

export default async function AdminLlmPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/admin/gateway`)
}
