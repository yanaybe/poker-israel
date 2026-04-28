import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'פוקר ישראל | מצא משחקים, הצטרף לקהילה',
  description: 'פלטפורמת פוקר ישראלית - מצא משחקי פוקר בקרבתך, פרסם משחקים, הצטרף לטורנירים',
  keywords: 'פוקר, ישראל, מזומן, טורניר, משחק קלפים',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
