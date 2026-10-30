// Kumpulan utility Tailwind yang dipakai berulang di halaman publik (beranda,
// berita, profil desa, peraturan, info). Warna dan font dari @theme index.css.

// Jarak antar section: 64px di ponsel sampai 120px di desktop.
export const sectionGap = 'mt-(--pb-section)'

export const sectionTitle =
  'm-0 font-display text-[clamp(30px,22px+1.6vw,44px)] font-bold leading-[1.08] tracking-tight text-pb-ink text-balance'

export const sectionSubtitle = 'mt-2.5 mb-0 max-w-[52ch] text-lg leading-relaxed text-pb-muted'

// Link teks bergaris bawah padi; dipakai untuk aksi sekunder.
export const textLink =
  'inline-flex min-h-11 items-center gap-2 text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] transition-colors hover:text-pb-laut-hover hover:decoration-current'

export const buttonPrimary =
  'inline-flex min-h-14 items-center justify-center gap-2.5 rounded-[10px] bg-pb-laut px-6 py-3.5 text-[17px] leading-tight font-bold text-white no-underline transition-colors hover:bg-pb-laut-hover hover:text-white active:translate-y-px'

// Label kategori berita: sudut kecil, bukan pil.
export const chip = 'rounded-sm bg-pb-laut-tint px-2 py-0.5 text-[13px] font-bold text-pb-laut'

export const metaRow =
  'flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-snug text-pb-muted'

// Judul kartu: berubah warna dan bergaris bawah saat kartu (group) di-hover.
export const cardTitleHover =
  'group-hover:text-pb-laut group-hover:underline group-hover:decoration-pb-padi group-hover:decoration-2 group-hover:underline-offset-[5px]'

export const stateBox =
  'm-0 rounded-2xl border border-dashed border-pb-line-strong bg-white px-6 py-12 text-center text-pb-muted'

export const errorBox =
  'm-0 rounded-2xl border border-[#f0b8b2] bg-[#fff6f5] px-6 py-12 text-center text-[#b42318]'
