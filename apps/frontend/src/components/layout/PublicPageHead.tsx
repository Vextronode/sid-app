import type { ReactNode } from 'react'

type PublicPageHeadProps = {
  title: ReactNode
  children?: ReactNode
}

// Kepala halaman publik (Berita, Profil Desa, Peraturan): judul besar dan
// paragraf pengantar di atas latar kontur terasering. Paragraf pertama
// berukuran pengantar, paragraf berikutnya (mis. alamat) sedikit lebih kecil.
export function PublicPageHead({ title, children }: PublicPageHeadProps) {
  return (
    <header className="border-b border-pb-line bg-pb-paper bg-(image:--pb-contour-dark) bg-position-[right_-60px_top_20px]">
      <div className="bd-container pt-[clamp(40px,24px+4vw,88px)] pb-[clamp(32px,20px+3vw,64px)]">
        <h1 className="m-0 max-w-[18ch] font-display text-[clamp(34px,24px+2.4vw,56px)] leading-[1.02] font-bold tracking-[-0.03em] text-balance text-pb-laut-deep">
          {title}
        </h1>
        <div className="max-w-[60ch] text-lg leading-relaxed text-pb-ink/85 [&>p]:mt-4 [&>p]:mb-0 [&>p+p]:mt-1.5 [&>p+p]:text-base">
          {children}
        </div>
      </div>
    </header>
  )
}
