import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'gold', size = 'md', loading, fullWidth, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-poker-bg disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      gold: 'bg-gold-gradient text-poker-bg shadow-gold hover:shadow-gold-lg hover:scale-[1.02] active:scale-[0.98]',
      outline: 'border-2 border-felt-600 text-poker-text hover:border-gold-500 hover:text-gold-400',
      ghost: 'text-poker-muted hover:text-poker-text hover:bg-felt-800/50',
      danger: 'bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-400',
      success: 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:border-green-400',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
