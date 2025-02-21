import { useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'

interface MetaTagsProps {
  seo: {
    title: string
    description: string
    keywords: string
    canonical?: string
    robots?: string
    og: {
      title: string
      description: string
      image?: string
      url: string
    }
    schema?: any
  }
}

export default function MetaTags({ seo }: MetaTagsProps) {
  useEffect(() => {
    // Strukturierte Daten für Google
    if (seo.schema) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.text = JSON.stringify(seo.schema)
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(script)
      }
    }
  }, [seo.schema])

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        {seo.robots && (
          <meta name="robots" content={seo.robots} />
        )}
        {seo.canonical && (
          <link rel="canonical" href={seo.canonical} />
        )}

        {/* Open Graph */}
        <meta property="og:title" content={seo.og.title} />
        <meta
          property="og:description"
          content={seo.og.description}
        />
        <meta property="og:url" content={seo.og.url} />
        {seo.og.image && (
          <meta property="og:image" content={seo.og.image} />
        )}

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.og.title} />
        <meta
          name="twitter:description"
          content={seo.og.description}
        />
        {seo.og.image && (
          <meta name="twitter:image" content={seo.og.image} />
        )}
      </Head>

      {/* Zusätzliche Scripts */}
      <Script
        id="schema-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(seo.schema || {})
        }}
      />
    </>
  )
} 