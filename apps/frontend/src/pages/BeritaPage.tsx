// ==========================================
// BeritaPage.tsx
// Halaman publik Berita.
// Ditata dengan utility Tailwind (token di index.css), di bawah .pub milik
// MainLayout.
// ==========================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'

import { usePublicNews } from '@/features/berita/usePublicNews'
import { PageLoader } from '@/components/ui/PageLoader'
import { PublicPageHead } from '@/components/layout/PublicPageHead'
import { cardTitleHover, chip, errorBox, metaRow, stateBox } from '@/features/beranda/publicClasses'

const ITEMS_PER_PAGE = 6

const page = 'bd-container pt-[clamp(32px,20px+3vw,64px)]'
const imageFill = '[&>img]:block [&>img]:size-full [&>img]:object-cover'
const placeholder = 'flex size-full items-center justify-center text-pb-laut'
const readMore =
  'inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] hover:text-pb-laut-hover hover:decoration-current'
const pagerButton =
  'inline-flex size-12 cursor-pointer items-center justify-center rounded-full border border-pb-line-strong bg-white text-pb-laut enabled:hover:border-pb-laut enabled:hover:bg-pb-laut-tint enabled:active:translate-y-px disabled:cursor-not-allowed disabled:text-pb-line-strong'

export function BeritaPage() {
  const navigate = useNavigate()

  // ==========================================
  // DATA DARI API
  // ==========================================

  const { news, loading, error } = usePublicNews()

  const [safeCurrentPage, setCurrentPage] = useState(1)

  // ==========================================
  // BERITA UTAMA
  // ==========================================

  const beritaUtama = news.find((b) => b.isFeatured) ?? news[0] ?? null

  // ==========================================
  // SEMUA BERITA PUBLIK (di luar berita utama)
  // Endpoint /public hanya mengirim berita
  // yang sudah terbit, jadi tidak perlu filter status.
  // ==========================================

  const kelolaList = news.filter((b) => b.id !== beritaUtama?.id)

  // ==========================================
  // BERITA TERBARU
  // ==========================================

  const beritaTerbaru = kelolaList.slice(0, 3)

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages = Math.max(1, Math.ceil(kelolaList.length / ITEMS_PER_PAGE))

  const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE

  const paginated = kelolaList.slice(start, start + ITEMS_PER_PAGE)

  // ==========================================
  // NAVIGATE DETAIL
  // ==========================================

  const handleDetail = (id: number) => {
    navigate(`/berita/${id}`)
  }

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  const pageHead = (
    <PublicPageHead title="Berita Desa Cibenda">
      <p>Kabar dan informasi terbaru dari Desa Cibenda.</p>
    </PublicPageHead>
  )

  if (loading) {
    return (
      <div className={page}>
        <PageLoader label="Memuat berita..." />
      </div>
    )
  }

  if (error) {
    return (
      <>
        {pageHead}
        <div className={page}>
          <p role="alert" className={errorBox}>
            {error}
          </p>
        </div>
      </>
    )
  }

  if (news.length === 0) {
    return (
      <>
        {pageHead}
        <div className={page}>
          <div className={stateBox} role="status">
            <Newspaper className="mx-auto mb-3 text-pb-laut" size={32} aria-hidden="true" />
            <p className="m-0">Belum ada berita yang dipublikasikan.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* ======================================
          HEADER
      ====================================== */}

      {pageHead}

      <div className={page}>
        {/* ======================================
            FEATURE + TERBARU
        ====================================== */}

        <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-12">
          {/* ====================================
              BERITA UTAMA
          ==================================== */}

          <article className="grid gap-6">
            <div
              className={`aspect-video overflow-hidden rounded-3xl bg-pb-laut-tint bg-(image:--pb-contour-dark) ${imageFill}`}
            >
              {beritaUtama?.imageUrl ? (
                <img src={beritaUtama.imageUrl} alt={beritaUtama.title} />
              ) : (
                <div className={placeholder}>
                  <Newspaper size={48} strokeWidth={1.6} aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-3">
              <div className={metaRow}>
                {beritaUtama?.categories?.map((category) => (
                  <span key={category} className={chip}>
                    {category}
                  </span>
                ))}

                {beritaUtama?.date && <span>{beritaUtama.date}</span>}
              </div>

              <h2 className="m-0 max-w-[28ch] font-display text-[clamp(26px,20px+1.4vw,38px)] leading-[1.1] font-bold tracking-tight text-balance text-pb-ink">
                {beritaUtama?.title ?? 'Belum ada berita utama'}
              </h2>

              {beritaUtama && (
                <button
                  type="button"
                  onClick={() => handleDetail(beritaUtama.id)}
                  className={readMore}
                >
                  Baca Selengkapnya
                </button>
              )}
            </div>
          </article>

          {/* ====================================
              BERITA TERBARU
          ==================================== */}

          <aside>
            <h3 className="mt-0 mb-1 font-display text-[22px] font-bold tracking-[-0.01em]">
              Terbaru
            </h3>

            <div className="flex flex-col">
              {beritaTerbaru.length === 0 ? (
                <p className={metaRow}>Belum ada berita terbaru.</p>
              ) : (
                beritaTerbaru.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleDetail(b.id)}
                    className="group flex w-full cursor-pointer items-center gap-4 border-0 border-b border-pb-line bg-transparent py-4.5 text-left text-pb-ink"
                  >
                    <div
                      className={`size-21 flex-none overflow-hidden rounded-[14px] bg-pb-laut-tint bg-(image:--pb-contour-dark) bg-size-[240px_auto] ${imageFill}`}
                    >
                      {b.imageUrl ? (
                        <img src={b.imageUrl} alt={b.title} />
                      ) : (
                        <div className={placeholder}>
                          <Newspaper size={22} strokeWidth={1.6} aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-1">
                      {b.category && (
                        <span className={metaRow}>
                          <span className={chip}>{b.category}</span>
                        </span>
                      )}

                      <p
                        className={`m-0 font-display text-lg leading-tight font-bold ${cardTitleHover}`}
                      >
                        {b.title}
                      </p>

                      <span className={metaRow}>{b.date}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </section>

        {/* ======================================
            SEMUA BERITA
        ====================================== */}

        <section>
          <div className="mt-(--pb-section) mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-pb-line pt-8">
            <div>
              <h2 className="m-0 font-display text-[clamp(22px,18px+0.8vw,28px)] font-bold tracking-[-0.02em]">
                Semua Berita
              </h2>

              <p className="mt-1.5 mb-0 text-base text-pb-muted">
                Kabar dan pengumuman terbaru dari Desa Cibenda
              </p>
            </div>

            {/* PAGINATION */}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Halaman sebelumnya"
                className={pagerButton}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Halaman berikutnya"
                className={pagerButton}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ====================================
              BERITA GRID
          ==================================== */}

          {paginated.length === 0 ? (
            <div className={stateBox}>
              <Newspaper className="mx-auto mb-3 text-pb-laut" size={32} aria-hidden="true" />

              <p className="m-0">Belum ada berita yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleDetail(b.id)}
                  className="group flex cursor-pointer flex-col gap-4 border-0 bg-transparent p-0 text-left text-pb-ink"
                >
                  {/* IMAGE */}

                  <div
                    className={`aspect-4/3 w-full overflow-hidden rounded-2xl bg-pb-laut-tint bg-(image:--pb-contour-dark) bg-size-[320px_auto] ${imageFill}`}
                  >
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt={b.title} />
                    ) : (
                      <div className={placeholder}>
                        <Newspaper size={32} strokeWidth={1.6} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}

                  <div className="flex flex-col gap-2">
                    <div className={metaRow}>
                      {b.categories?.map((category) => (
                        <span key={category} className={chip}>
                          {category}
                        </span>
                      ))}

                      <span>{b.date}</span>
                    </div>

                    <h3
                      className={`m-0 font-display text-[21px] leading-[1.22] font-bold tracking-[-0.01em] text-pretty ${cardTitleHover}`}
                    >
                      {b.title}
                    </h3>

                    <p className="m-0 line-clamp-3 text-base leading-normal text-pb-muted empty:hidden">
                      {b.excerpt}
                    </p>

                    {/* Seluruh kartu sudah tombol; ini hanya petunjuk visual. */}
                    <span className="mt-1 self-start text-base font-bold text-pb-laut underline decoration-pb-padi decoration-2 underline-offset-[6px] group-hover:decoration-current">
                      Baca Selengkapnya
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ====================================
              PAGINATION INFO
          ==================================== */}

          {kelolaList.length > 0 && (
            <div className="mt-10 text-[15px] text-pb-muted">
              Menampilkan {start + 1}–{Math.min(start + ITEMS_PER_PAGE, kelolaList.length)} dari{' '}
              {kelolaList.length} berita
            </div>
          )}
        </section>
      </div>
    </>
  )
}
