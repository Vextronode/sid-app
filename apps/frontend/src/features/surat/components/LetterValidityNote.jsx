// Keterangan masa berlaku surat approved untuk pemohon. `expires_at`
// dicap saat final approve; NULL berarti berlaku tanpa batas.
function formatDate(value) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function LetterValidityNote({ surat }) {
  if (!surat?.expires_at) {
    return null
  }

  if (surat.is_expired) {
    return (
      <div className="sid-letter-validity sid-letter-validity-expired" role="status">
        <span className="sid-status-badge sid-status-rejected">Kedaluwarsa</span>
        <p>
          Masa berlaku surat habis pada {formatDate(surat.expires_at)}. Surat hanya tersimpan
          sebagai riwayat dan tidak dapat diunduh lagi.
        </p>
      </div>
    )
  }

  return (
    <div className="sid-letter-validity">
      <p>Berlaku sampai {formatDate(surat.expires_at)}</p>
    </div>
  )
}
