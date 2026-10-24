// Urutan tampil kelompok jenis surat (LetterTypeCategory di backend).
const GROUPS = [
  { key: 'persuratan', label: 'Persuratan Desa' },
  { key: 'pelayanan', label: 'Pelayanan Desa' },
]

/**
 * Kelompokkan jenis surat untuk pilihan pengajuan: Persuratan Desa di atas,
 * Pelayanan Desa di bawah. Kelompok kosong dilewati; jenis tanpa kategori
 * dianggap Persuratan Desa.
 */
export function groupLetterTypes(letterTypes = []) {
  return GROUPS.map((group) => ({
    ...group,
    types: letterTypes.filter((type) => (type.category ?? 'persuratan') === group.key),
  })).filter((group) => group.types.length > 0)
}
