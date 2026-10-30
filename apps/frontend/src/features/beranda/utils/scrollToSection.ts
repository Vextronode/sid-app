// Gulir ke section beranda (A7, A8). Sengaja tidak memakai scroll-behavior
// di html agar halaman lain tidak terpengaruh. Jarak header diatur lewat
// scroll-margin-top di CSS section.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Mengembalikan false bila section tidak ditemukan. */
export function scrollToSection(id) {
  const target = typeof document !== 'undefined' ? document.getElementById(id) : null
  if (!target) return false
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  return true
}
