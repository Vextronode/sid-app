// Loading tingkat halaman: lapisan blur dengan spinner berputar di tengah.
// fullscreen menutupi seluruh layar (cek sesi, sebelum layout ada); tanpa
// fullscreen hanya mengisi area konten sehingga header/sidebar tetap terlihat.
type PageLoaderProps = {
  label?: string
  fullscreen?: boolean
}

export function PageLoader({ label = 'Memuat...', fullscreen = false }: PageLoaderProps) {
  return (
    <div
      className={`sid-page-loader${fullscreen ? ' sid-page-loader--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="sid-page-loader-spinner" aria-hidden="true" />
      <span className="sid-page-loader-label">{label}</span>
    </div>
  )
}
