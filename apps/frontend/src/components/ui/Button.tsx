import type { ButtonHTMLAttributes } from 'react'

export function Button({ children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled}
      className={`w-full py-3 mt-4 rounded-lg font-bold text-white text-base transition-colors ${
        disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#163e6b] hover:bg-[#0e2a4a]'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}
