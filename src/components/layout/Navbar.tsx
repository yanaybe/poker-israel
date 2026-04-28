'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Bell, LogOut, User, PlusCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!session) return
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifCount(data.count)
        }
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [session])

  const navLinks = [
    { href: '/games', label: 'משחקים', icon: '🃏' },
    { href: '/tournaments', label: 'טורנירים', icon: '🏆' },
    ...(session ? [
      { href: '/messages', label: 'הודעות', icon: '💬' },
      { href: `/profile/${session.user.id}`, label: 'פרופיל', icon: '👤' },
    ] : []),
  ]

  return (
    <nav className={cn(
      'fixed top-0 w-full z-40 transition-all duration-300',
      scrolled ? 'glass-card border-b border-felt-700/50 shadow-felt' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left side: auth actions or hamburger */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-poker-muted hover:text-poker-text rounded-lg hover:bg-felt-800/50 transition-all"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="תפריט"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop: auth */}
            <div className="hidden lg:flex items-center gap-2">
              {session ? (
                <>
                  <Link href="/create-game" className="flex items-center gap-1.5 px-4 py-2 bg-gold-gradient text-poker-bg font-semibold text-sm rounded-xl shadow-gold hover:shadow-gold-lg transition-all">
                    <PlusCircle className="w-4 h-4" />
                    <span>פרסם משחק</span>
                  </Link>

                  <div className="relative">
                    <Link href="/messages" className="p-2 text-poker-muted hover:text-poker-text rounded-lg hover:bg-felt-800/50 transition-all block">
                      <Bell className="w-5 h-5" />
                    </Link>
                    {notifCount > 0 && (
                      <span className="notification-dot">
                        <span className="sr-only">{notifCount} התראות</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="p-2 text-poker-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"
                    title="התנתק"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-sm text-poker-muted border border-felt-600 rounded-xl hover:border-gold-500 hover:text-gold-400 transition-all">
                    התחבר
                  </Link>
                  <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-gold-gradient text-poker-bg rounded-xl shadow-gold hover:shadow-gold-lg transition-all">
                    הירשם
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Center: nav links (desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'text-gold-400 bg-gold-500/10'
                    : 'text-poker-muted hover:text-poker-text hover:bg-felt-800/50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Logo */}
          <Link href={session ? '/games' : '/'} className="flex items-center gap-2 group">
            <span className="text-2xl font-black gold-shimmer group-hover:scale-105 transition-transform">
              פוקר ישראל
            </span>
            <span className="text-3xl group-hover:rotate-12 transition-transform">♠</span>
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden glass-card border-t border-felt-700/50 animate-slide-up">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  pathname === link.href
                    ? 'text-gold-400 bg-gold-500/10'
                    : 'text-poker-muted hover:text-poker-text hover:bg-felt-800/50'
                )}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}

            <div className="pt-3 border-t border-felt-700/50 space-y-2">
              {session ? (
                <>
                  <Link
                    href="/create-game"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-3 bg-gold-gradient text-poker-bg font-semibold rounded-xl"
                  >
                    <PlusCircle className="w-4 h-4" />
                    פרסם משחק
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-2 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    התנתק
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block w-full px-4 py-3 text-center border border-felt-600 rounded-xl text-poker-muted text-sm">
                    התחבר
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="block w-full px-4 py-3 text-center bg-gold-gradient text-poker-bg font-semibold rounded-xl text-sm">
                    הירשם
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
