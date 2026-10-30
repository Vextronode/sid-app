// Backend menyimpan nama lengkap ("Desa Cibenda"), tapi data lama atau isian
// manual bisa tanpa awalan ("Cibenda"). Tampilkan selalu dengan satu awalan
// "Desa" agar tidak muncul "Desa Desa Cibenda".
export function formatVillageName(name: unknown): string | null {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return null

  return /^desa\s/i.test(trimmed) ? trimmed : `Desa ${trimmed}`
}
