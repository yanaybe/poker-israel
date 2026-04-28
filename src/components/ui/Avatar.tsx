import Image from 'next/image'
import { getAvatarUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  image?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
  xl: { container: 'w-20 h-20', text: 'text-2xl' },
}

export function Avatar({ name, image, size = 'md', className }: AvatarProps) {
  const { container, text } = sizes[size]
  const src = getAvatarUrl(name, image)

  return (
    <div className={cn('relative rounded-full overflow-hidden ring-2 ring-felt-600 flex-shrink-0', container, className)}>
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        unoptimized={!image}
      />
    </div>
  )
}
