import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-felt-700/50 text-poker-muted border border-felt-600/50',
    gold: 'bg-gold-500/10 text-gold-400 border border-gold-500/30',
    green: 'bg-green-500/10 text-green-400 border border-green-500/30',
    red: 'bg-red-500/10 text-red-400 border border-red-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
  }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
