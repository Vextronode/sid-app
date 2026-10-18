import '@/styles/beranda.css'

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { PageLoader } from '@/components/ui/PageLoader'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import { formatVillageName } from '@/shared/lib/villageName'
import { INFO_PAGES } from '../infoPagesContent'
import { hasSlot, renderBlocks, renderTemplate } from '../infoTemplate'
import { CopyValue } from './CopyValue'

// Halaman informasi (D6): Kebijakan privasi, Aksesibilitas, PPID.
// Teks baku dari infoPagesContent.js; isian khas desa dari
// /api/public/info-pages/{page} (menu Halaman Informasi) dan data desa.
// Isian yang belum diisi tampil sebagai penanda kuning "[...]".
// Dirender di dalam MainLayout (yang sudah punya <main>), jadi isinya <article>.
// Ditata dengan utility Tailwind (token di index.css); kelas bd-info-* tetap
// ada sebagai penanda untuk tes.

// Identitas desa untuk token {village.*}. fullName: "Desa X, Kecamatan Y,
// Kabupaten Z" dari bagian yang tersedia.
function villageContext(village) {
  const name = formatVillageName(village?.name) ?? 'Desa'
  const fullName = [
    name,
    village?.district && `Kecamatan ${village.district}`,
    village?.regency && `Kabupaten ${village.regency}`,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    name,
    fullName,
    district: village?.district ?? null,
    regency: village?.regency ?? null,
    province: village?.province ?? null,
    phone: village?.phone ?? null,
    office_hours: village?.office_hours ?? null,
    email: village?.email ?? null,
  }
}

// Bagian teks dan slot "[...]" (isian yang belum diisi) sebagai penanda kuning.
// Telepon dan email terisi tampil biru dan bisa disalin (CopyValue).
function Parts({ parts }) {
  return parts.map((part, index) => {
    if (typeof part === 'string') return part

    if (part.copy) return <CopyValue key={index} value={part.copy} kind={part.kind} />

    return (
      <mark key={index} className="bd-info-slot rounded-sm bg-pb-padi-soft px-1 text-pb-padi-ink">
        {part.slot}
      </mark>
    )
  })
}

function InfoBlock({ block }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 className="mt-12 mb-3 font-display text-[clamp(22px,18px+0.8vw,28px)] leading-[1.15] font-bold tracking-[-0.02em]">
          <Parts parts={block.parts} />
        </h2>
      )
    case 'h3':
      return (
        <h3 className="mt-7 mb-2 font-display text-xl font-bold">
          <Parts parts={block.parts} />
        </h3>
      )
    case 'ul':
    case 'ol': {
      const List = block.type
      return (
        <List
          className={`mt-0 mb-4 pl-[1.4em] [&>li+li]:mt-1.5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
        >
          {block.items.map((parts, index) => (
            <li key={index}>
              <Parts parts={parts} />
            </li>
          ))}
        </List>
      )
    }
    default:
      return (
        <p className="mt-0 mb-4">
          <Parts parts={block.parts} />
        </p>
      )
  }
}

export function InfoPage({ page }) {
  const content = INFO_PAGES[page]
  const { village } = usePublicVillageInfo()
  const [state, setState] = useState({ page: null, data: null })

  // Aplikasi tidak punya scroll restoration, dan link footer ada di dasar beranda.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(() => {
    let active = true

    api
      .get(`/api/public/info-pages/${page}`, { params: publicVillageParams() })
      .then((response) => response.data?.data ?? null)
      // Gagal memuat isian: teks baku tetap tampil, bagian khas desa sebagai penanda.
      .catch(() => null)
      .then((data) => {
        if (active) setState({ page, data })
      })

    return () => {
      active = false
    }
  }, [page])

  const loaded = state.page === page

  const rendered = useMemo(() => {
    if (!content || !loaded) return null

    const context = {
      ...(state.data?.fields ?? {}),
      updated_at: state.data?.updated_at ?? null,
      village: villageContext(village),
    }

    const status = renderTemplate(content.status, context, content.placeholders)

    return {
      // Status opsional (mis. "Diperbarui …") tidak tampil selama tokennya kosong.
      status: content.statusOptional && hasSlot(status) ? null : status,
      blocks: renderBlocks(content.blocks, context, content.placeholders),
    }
  }, [content, loaded, state.data, village])

  if (!content) return null

  return (
    <div className="bd-root bd-info">
      <article className="bd-container">
        <div className="max-w-[72ch] pt-[clamp(40px,24px+4vw,88px)] text-lg leading-[1.7]">
          <h1 className="m-0 font-display text-[clamp(34px,24px+2.4vw,56px)] leading-[1.04] font-bold tracking-[-0.03em] text-pb-laut-deep">
            {content.title}
          </h1>

          {!rendered ? (
            <PageLoader label="Memuat halaman..." />
          ) : (
            <>
              {rendered.status ? (
                <p className="bd-info-status mt-5 mb-8 rounded-r-[10px] border-l-[3px] border-pb-padi bg-pb-padi-soft px-4.5 py-3.5 text-base text-[#3d2c00]">
                  <Parts parts={rendered.status} />
                </p>
              ) : (
                <div className="mb-8" />
              )}
              {rendered.blocks.map((block, index) => (
                <InfoBlock key={index} block={block} />
              ))}
            </>
          )}
        </div>
      </article>
    </div>
  )
}
