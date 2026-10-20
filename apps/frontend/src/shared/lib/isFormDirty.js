// Apakah isian form berbeda dari nilai awalnya (saat modal dibuka).
// Perbandingan dangkal per kunci; array dibandingkan per nilai, dan berkas
// (File/Blob) yang dipilih selalu dihitung sebagai perubahan.
function isFile(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function sameValue(a, b) {
  if (isFile(a) || isFile(b)) return a === b
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => sameValue(item, b[index]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  // null/undefined/'' dianggap sama-sama kosong.
  const empty = (value) => value === null || value === undefined || value === ''
  if (empty(a) && empty(b)) return true

  return String(a) === String(b)
}

export function isFormDirty(current, initial) {
  if (!current || !initial) return false

  const keys = new Set([...Object.keys(current), ...Object.keys(initial)])

  for (const key of keys) {
    if (!sameValue(current[key], initial[key])) return true
  }

  return false
}
