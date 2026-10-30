import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Router tidak mengembalikan posisi gulir saat pindah halaman, sehingga
// halaman baru (mis. "Semua berita →" dari tengah beranda) terbuka di posisi
// gulir halaman sebelumnya. Mulai dari atas, kecuali:
// - ada #hash: halaman tujuan sendiri yang menggulir ke section-nya;
// - tombol Kembali/Maju (POP): biarkan browser memulihkan posisinya.
export function ScrollToTop(): null {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (hash || navigationType === 'POP') return

    window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return null
}
