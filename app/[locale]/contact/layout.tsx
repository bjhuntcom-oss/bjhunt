import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contactMeta' })
  
  return {
    title: t('title'),
    description: t('description'),
    keywords: locale === 'en' 
      ? ['contact BJHUNT', 'cybersecurity support', 'security partnership']
      : ['contact BJHUNT', 'support cybersécurité', 'partenariat sécurité'],
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: `https://www.bjhunt.com/${locale}/contact`,
    },
    alternates: { canonical: `https://www.bjhunt.com/${locale}/contact` },
  }
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
