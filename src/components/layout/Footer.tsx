import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-felt-800/50 py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-poker-subtle">
            <Link href="/games" className="hover:text-poker-muted transition-colors">משחקים</Link>
            <span>·</span>
            <Link href="/tournaments" className="hover:text-poker-muted transition-colors">טורנירים</Link>
          </div>

          <div className="text-center">
            <p className="text-poker-subtle/70 text-sm">♠ ♥ ♦ ♣ &nbsp; פוקר ישראל 2026</p>
            <p className="text-poker-subtle/40 text-xs mt-1">לשחקנים אחראיים בלבד · גיל 18+</p>
          </div>

          <div className="text-sm text-poker-subtle/60">
            Built with ♥ for Israeli poker community
          </div>
        </div>
      </div>
    </footer>
  )
}
