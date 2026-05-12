import { MetadataRoute } from 'next'

// We canonical-redirect the apex `bjhunt.com` to `www.bjhunt.com` at the
// edge, so the sitemap lists only the www host. `next-intl` runs with
// `localePrefix: 'always'`, so every path is reachable at /fr/<page> AND
// /en/<page> — we emit both with `alternates.languages` so Google honours
// hreflang and doesn't treat them as duplicates.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.bjhunt.com'
  const now = new Date()

  // (slug, changeFrequency, priority). Slug '' = locale root.
  const pages: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    ['',                         'weekly',  1.0],
    ['beta',                     'weekly',  0.9],
    ['pricing',                  'weekly',  0.9],
    ['investors',                'monthly', 0.8],
    ['api-docs',                 'monthly', 0.8],
    ['contact',                  'monthly', 0.7],
    ['technology',               'monthly', 0.7],
    ['technology/deep-dive',     'monthly', 0.6],
    ['labs/audit',               'weekly',  0.7],
    ['legal',                    'yearly',  0.3],
    ['legal/ai-policy',          'yearly',  0.3],
    ['legal/accessibility',      'yearly',  0.3],
  ]

  return pages.map(([slug, changeFrequency, priority]) => {
    const fr = `${base}/fr${slug ? `/${slug}` : ''}`
    const en = `${base}/en${slug ? `/${slug}` : ''}`
    return {
      url: fr,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: { fr, en, 'x-default': en },
      },
    }
  })
}
