import { ReactNode } from 'react'
import { I18nManager } from '@/lib/i18n'
import { headers } from 'next/headers'

interface RootLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

async function getMessages(locale: string) {
  const i18n = I18nManager.getInstance()
  return i18n.loadTranslations([locale])
}

export default async function RootLayout({
  children,
  params: { locale }
}: RootLayoutProps) {
  const messages = await getMessages(locale)
  const headersList = headers()
  const direction = headersList.get('direction') || 'ltr'

  return (
    <html lang={locale} dir={direction}>
      <body>
        <I18nProvider
          locale={locale}
          messages={messages}
          timeZone={headersList.get('time-zone')}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}

export async function generateStaticParams() {
  const locales = await prisma.locale.findMany({
    where: { active: true },
    select: { code: true }
  })

  return locales.map((locale) => ({
    locale: locale.code
  }))
} 