import { User } from 'lucide-react'

import { userPhotoUrl } from '@/features/auth/utils/userPhoto'

// Foto bulat akun yang login di header; ikon orang bila belum ada foto.
export function UserAvatar({ user, size = 32, className = '' }) {
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
        <User size={Math.round(size * 0.55)} strokeWidth={2} />
      )}
    </span>
  )
}
