// Bagan struktur di halaman publik: Perangkat Desa (Profil Desa), BPD, dan
// Lembaga Desa memakai kartu dan garis bagan yang sama.

import { Users } from 'lucide-react'

// Teks untuk data yang belum dikirim backend
export const NA = 'Belum tersedia'

// Tampilan seragam untuk data yang belum dikirim backend (miring, abu-abu).
export function NotAvailable({ text = NA }) {
  return <p className="mt-1 mb-0 text-base text-pb-muted italic">{text}</p>
}

// Foto berbingkai gapura (atap setengah lingkaran), sama dengan foto hero.
function Avatar({ src, name, head }: { src?: string | null; name?: string | null; head: boolean }) {
  return (
    <div
      className={`mb-3.5 flex items-center justify-center overflow-hidden rounded-t-full rounded-b-xl bg-pb-laut-tint bg-(image:--pb-contour-dark) bg-size-[200px_auto] text-pb-laut ${head ? 'h-35 w-32' : 'h-26 w-24 max-sm:h-20 max-sm:w-18'}`}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="size-full object-cover" />
      ) : (
        <Users size={28} strokeWidth={1.6} aria-hidden="true" />
      )}
    </div>
  )
}

// official: { nama, jabatan, foto }. head: kartu pimpinan, lebih besar dengan
// garis padi di atas. fluid: lebar mengikuti grid.
export type OfficialCardData = { nama?: string | null; jabatan: string; foto?: string | null }

export function OfficialCard({
  official,
  head = false,
  fluid = false,
}: {
  official: OfficialCardData
  head?: boolean
  fluid?: boolean
}) {
  const width = head ? 'w-70' : fluid ? 'w-auto' : 'w-55'

  return (
    <div
      className={`flex flex-col items-center rounded-2xl bg-white px-4.5 pb-5.5 text-center max-sm:w-auto ${width} ${head ? 'pt-7 shadow-[inset_0_4px_0_var(--color-pb-padi),0_0_0_1px_var(--color-pb-laut)]' : 'pt-6 shadow-[0_0_0_1px_var(--color-pb-line)]'}`}
    >
      <Avatar src={official.foto} name={official.nama} head={head} />

      {official.nama ? (
        <p
          className={`m-0 font-display leading-tight font-bold ${head ? 'text-[22px]' : 'text-lg'}`}
        >
          {official.nama}
        </p>
      ) : (
        <NotAvailable />
      )}

      <p className="mt-1 mb-0 text-[15px] leading-snug text-pb-muted">{official.jabatan}</p>
    </div>
  )
}

// Satu tingkat bagan. Tingkat kedua dan seterusnya disambung garis tegak ke
// tingkat di atasnya.
export const orgRow =
  "relative flex w-full flex-wrap justify-center gap-4 max-sm:flex-col max-sm:items-stretch [&+&]:mt-10 [&+&]:before:absolute [&+&]:before:-top-10 [&+&]:before:left-1/2 [&+&]:before:h-10 [&+&]:before:w-0.5 [&+&]:before:bg-pb-line-strong [&+&]:before:content-['']"

// Grid kartu untuk daftar yang panjang (Kepala Dusun, Anggota).
export const orgGrid =
  'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-sm:grid-cols-2 max-sm:gap-3'

// Judul pemisah di bawah bagan (mis. "Kepala Dusun", "Anggota").
export const orgDivider =
  'mt-16 mb-5 border-t border-pb-line pt-8 text-center font-display text-2xl font-bold tracking-[-0.01em]'
