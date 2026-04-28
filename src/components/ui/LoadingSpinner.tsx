import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, text }: { className?: string; text?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-felt-700" />
        <div className="absolute inset-0 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-gold-400 text-lg">♠</span>
      </div>
      {text && <p className="text-poker-muted text-sm">{text}</p>}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-felt-700 rounded w-3/4" />
      <div className="h-3 bg-felt-700 rounded w-1/2" />
      <div className="h-3 bg-felt-700 rounded w-2/3" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 bg-felt-700 rounded w-16" />
        <div className="h-6 bg-felt-700 rounded w-20" />
      </div>
    </div>
  )
}
