// Salin teks ke clipboard. navigator.clipboard hanya ada di konteks aman
// (https/localhost); di http biasa (mis. dibuka lewat IP LAN) dipakai
// cadangan textarea + execCommand. Mengembalikan true bila berhasil.
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // lanjut ke cadangan
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    return copied
  } catch {
    return false
  }
}
