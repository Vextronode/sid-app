// ==========================================
// DossierParts.tsx
// Bagian-bagian panel berkas pada LetterDossierModal.
// ==========================================

import { useId } from 'react'
import type { ReactNode } from 'react'

import { formatApprovalLevel, formatDossierDateTime, getApprovalActor } from './dossierFormat'
import type { LetterApproval } from '@/types'

export function DossierSection({ title, children }: { title: string; children?: ReactNode }) {
  const headingId = useId()

  return (
    <section className="sid-dossier-section" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {children}
    </section>
  )
}

/** Daftar label-nilai; baris tanpa nilai dilewati. */
export function DossierFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  const rows = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== '',
  )

  return (
    <dl className="sid-dossier-facts">
      {rows.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DossierQuote({ children, tone }: { children: ReactNode; tone?: string }) {
  return <p className={`sid-dossier-quote${tone ? ` ${tone}` : ''}`}>{children}</p>
}

/** Riwayat keputusan yang sudah terjadi, urut waktu. */
export function ApprovalTimeline({ approvals = [] }: { approvals?: LetterApproval[] }) {
  const sorted = [...approvals].sort(
    (first, second) =>
      new Date(first?.created_at ?? 0).getTime() - new Date(second?.created_at ?? 0).getTime(),
  )

  if (!sorted.length) {
    return <p className="sid-dossier-muted">Belum ada keputusan.</p>
  }

  return (
    <ol className="sid-dossier-timeline">
      {sorted.map((approval) => {
        const rejected = approval.action !== 'approved'

        return (
          <li key={approval.id} className={rejected ? 'rejected' : 'done'}>
            <p className="sid-dossier-timeline-title">
              {formatApprovalLevel(approval.approval_level)}{' '}
              <span>{rejected ? 'menolak' : 'menyetujui'}</span>
            </p>
            <p className="sid-dossier-timeline-meta">
              {getApprovalActor(approval)}, {formatDossierDateTime(approval.created_at) ?? '-'}
            </p>
            {approval.notes && <p className="sid-dossier-timeline-note">{approval.notes}</p>}
          </li>
        )
      })}
    </ol>
  )
}
