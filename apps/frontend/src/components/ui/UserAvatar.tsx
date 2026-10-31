import { User as UserIcon } from 'lucide-react'

import { userPhotoUrl } from '@/features/auth/utils/userPhoto'
import type { User } from '@/types'

type UserAvatarProps = {
  user: User | null | undefined
  size?: number
  className?: string
}

// Foto bulat akun yang login di header; ikon orang bila belum ada foto.
export function UserAvatar({ user, size = 32, className = '' }: UserAvatarProps) {
  const src = userPhotoUrl(user)

  return (
    <span
      className={`sid-user-avatar ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <UserIcon size={Math.round(size * 0.55)} strokeWidth={2} />
      )}
    </span>
  )
}
