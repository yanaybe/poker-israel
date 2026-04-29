'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Menu, X, Bell, LogOut, PlusCircle } from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import type { GameNotification, PendingRequestNotif } from '@/types'

interface NotifData {
  count: number
  pendingRequests: PendingRequestNotif[]
  notifications: GameNotification[]
}

const EMPTY: NotifData = { count: 0, pendingRequests: [], notifications: [] }

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifData, setNotifData] = useState<NotifData>(EMPTY)
  const [scrolled, setScrolled] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifs = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setNotifData(await res.json())
    } catch {}
  }, [session])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  const openNotifs = () => {
    const opening = !showNotifs
    setShowNotifs(opening)
    if (opening && notifData.notifications.some((n) => !n.read)) {
      fetch('/api/notifications', { method: 'PATCH' }).then(() => fetchNotifs())
    }
  }

  const handleAction = async (gameId: string, requestId: string, action: 'APPROVED' | 'REJECTED') => {
    await fetch(`/api/games/${gameId}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action }),
    })
    fetchNotifs()
  }

  const navLinks = [
    { href: '/games', label: 'משחקים', icon: '🃏' },
    { href: '/tournaments', label: 'טורנירים', icon: '🏆' },
    ...(session ? [
      { href: '/messages', label: 'הודעות', icon: '💬' },
      { href: '/premium', label: 'פרמיום ⭐', icon: '' },
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

          {/* Left: auth / hamburger */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-poker-muted hover:text-poker-text rounded-lg hover:bg-felt-800/50 transition-all"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="תפריט"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="hidden lg:flex items-center gap-2">
              {session ? (
                <>
                  <Link href="/create-game" className="flex items-center gap-1.5 px-4 py-2 bg-gold-gradient text-poker-bg font-semibold text-sm rounded-xl shadow-gold hover:shadow-gold-lg transition-all">
                    <PlusCircle className="w-4 h-4" />
                    <span>פרסם משחק</span>
                  </Link>

                  {/* Bell + notification dropdown */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={openNotifs}
                      className="p-2 text-poker-muted hover:text-poker-text rounded-lg hover:bg-felt-800/50 transition-all"
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                    {notifData.count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gold-500 text-poker-bg text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {notifData.count > 9 ? '9+' : notifData.count}
                      </span>
                    )}

                    {showNotifs && (
                      <div className="absolute top-10 right-0 w-80 z-50 glass-card border border-felt-700/50 rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-felt-700/50">
                          <span className="font-bold text-sm text-poker-text">התראות</span>
                          {notifData.count > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-gold-500/20 text-gold-400 rounded-full">
                              {notifData.count} חדשות
                            </span>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-felt-700/30">
                          {notifData.pendingRequests.length === 0 && notifData.notifications.length === 0 ? (
                            <div className="p-8 text-center text-poker-subtle text-sm">אין התראות</div>
                          ) : (
                            <>
                              {notifData.pendingRequests.map((req) => (
                                <div key={req.id} className="p-4">
                                  <p className="text-xs text-poker-subtle mb-1">בקשת הצטרפות</p>
                                  <p className="text-sm text-poker-text mb-1">
                                    <span className="font-semibold">{req.user.name}</span>
                                    {' '}ביקש להצטרף ל
                                    <span className="text-gold-400">"{req.gameName}"</span>
                                  </p>
                                  {req.message && (
                                    <p className="text-xs text-poker-subtle italic mb-2">"{req.message}"</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => handleAction(req.gameId, req.id, 'APPROVED')}
                                      className="flex-1 py-1.5 text-xs font-semibold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all"
                                    >
                                      ✓ אשר
                                    </button>
                                    <button
                                      onClick={() => handleAction(req.gameId, req.id, 'REJECTED')}
                                      className="flex-1 py-1.5 text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                                    >
                                      ✗ דחה
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {notifData.notifications.map((n) => (
                                <Link
                                  key={n.id}
                                  href={n.gameId ? `/games/${n.gameId}` : '#'}
                                  onClick={() => setShowNotifs(false)}
                                >
                                  <div className={cn(
                                    'p-4 hover:bg-felt-800/30 transition-all cursor-pointer',
                                    !n.read && 'bg-gold-500/5'
                                  )}>
                                    <p className="text-sm text-poker-text">{n.message}</p>
                                    <p className="text-xs text-poker-subtle mt-1">{formatTimeAgo(n.createdAt)}</p>
                                  </div>
                                </Link>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
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
