'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Spade, Trophy, MessageCircle, Users, ChevronLeft } from 'lucide-react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/games')
    }
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-poker-bg">
        <div className="flex items-center gap-3 text-gold-400 text-xl">
          <span className="text-4xl animate-bounce">♠</span>
          <span>טוען...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-bg felt-bg overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-card border-b border-felt-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm text-poker-muted border border-felt-600 rounded-lg hover:border-gold-500 hover:text-gold-400 transition-all">
              התחבר
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-gold-gradient text-poker-bg rounded-lg shadow-gold hover:shadow-gold-lg transition-all">
              הירשם חינם
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black gold-shimmer">פוקר ישראל</span>
            <span className="text-3xl sm:text-4xl">♠</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 text-center relative">
        {/* Decorative card suits */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <span className="absolute top-20 right-[10%] text-8xl opacity-5 suit-black rotate-12">♠</span>
          <span className="absolute top-32 left-[8%] text-9xl opacity-5 suit-red -rotate-6">♥</span>
          <span className="absolute bottom-10 right-[5%] text-7xl opacity-5 suit-red rotate-6">♦</span>
          <span className="absolute bottom-20 left-[12%] text-8xl opacity-5 suit-black -rotate-12">♣</span>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-sm font-medium">
            <span>🎰</span>
            <span>הקהילה הגדולה של שחקני הפוקר בישראל</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="text-poker-text">מצא את</span>
            <br />
            <span className="gold-shimmer">המשחק הבא שלך</span>
          </h1>

          <p className="text-lg sm:text-xl text-poker-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            הצטרף לאלפי שחקני פוקר ישראלים. פרסם משחקים, הצטרף לקהילה,
            גלה טורנירים ותחבר עם שחקנים ברמה שלך.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 bg-gold-gradient text-poker-bg font-bold text-lg rounded-xl shadow-gold-lg hover:shadow-gold hover:scale-105 transition-all animate-pulse-gold">
              התחל עכשיו — חינם
            </Link>
            <Link href="/games" className="px-8 py-4 border-2 border-felt-500 text-poker-text font-semibold text-lg rounded-xl hover:border-gold-500 hover:text-gold-400 transition-all flex items-center justify-center gap-2">
              <span>צפה במשחקים</span>
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4">
          {[
            { value: '500+', label: 'שחקנים רשומים' },
            { value: '50+', label: 'משחקים פעילים' },
            { value: '10+', label: 'ערים ברחבי הארץ' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl sm:text-3xl font-black gold-shimmer">{stat.value}</div>
              <div className="text-xs sm:text-sm text-poker-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center text-poker-text mb-4">
            הכל במקום אחד
          </h2>
          <p className="text-center text-poker-muted mb-12">מה תמצא בפוקר ישראל</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <span className="text-4xl">🃏</span>,
                title: 'משחקים ביתיים',
                desc: 'פרסם ומצא קאש גיימס ביתיים בכל רחבי הארץ',
                color: 'from-felt-800 to-felt-900',
              },
              {
                icon: <Trophy className="w-10 h-10 text-gold-400" />,
                title: 'טורנירים',
                desc: 'גלה טורנירים מקצועיים עם פרסים גדולים',
                color: 'from-felt-800 to-felt-900',
              },
              {
                icon: <MessageCircle className="w-10 h-10 text-blue-400" />,
                title: 'מסרים ישירים',
                desc: 'תקשר ישירות עם מארחים ושחקנים',
                color: 'from-felt-800 to-felt-900',
              },
              {
                icon: <Users className="w-10 h-10 text-purple-400" />,
                title: 'קהילה',
                desc: 'בנה את הרשת שלך, מצא שחקנים ברמה שלך',
                color: 'from-felt-800 to-felt-900',
              },
            ].map((feat) => (
              <div key={feat.title} className={`glass-card rounded-2xl p-6 hover:border-gold-500/30 transition-all cursor-default`}>
                <div className="mb-4">{feat.icon}</div>
                <h3 className="text-lg font-bold text-poker-text mb-2">{feat.title}</h3>
                <p className="text-poker-muted text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card rounded-3xl p-10 border border-gold-500/20">
            <div className="text-5xl mb-4">♠ ♥ ♦ ♣</div>
            <h2 className="text-3xl font-black text-poker-text mb-4">מוכן לשחק?</h2>
            <p className="text-poker-muted mb-8">הצטרף לפוקר ישראל היום והתחל למצוא משחקים</p>
            <Link href="/register" className="inline-block px-10 py-4 bg-gold-gradient text-poker-bg font-bold text-lg rounded-xl shadow-gold-lg hover:scale-105 transition-all">
              הצטרף עכשיו — חינם לגמרי
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-felt-800/50 text-center">
        <p className="text-poker-subtle text-sm">
          ♠ ♥ ♦ ♣ &nbsp; פוקר ישראל 2026 &nbsp; ♣ ♦ ♥ ♠
        </p>
        <p className="text-poker-subtle/50 text-xs mt-2">
          לשחקנים אחראיים בלבד · גיל 18+
        </p>
      </footer>
    </div>
  )
}
