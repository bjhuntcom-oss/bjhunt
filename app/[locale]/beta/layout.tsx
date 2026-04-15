import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beta BJHUNT | Plateforme de Cybersécurité IA',
  description: 'Rejoignez la beta BJHUNT et soyez parmi les premiers à tester notre plateforme de pentest propulsée par l\'IA',
}

export default function BetaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
