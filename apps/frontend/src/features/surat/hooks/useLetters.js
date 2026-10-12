import { useSuratListQuery } from './useSuratListQuery'

export const OWN_LETTERS_PER_PAGE = 10

// Surat yang diajukan pengguna sendiri, apa pun perannya. Berpaginasi di
// server supaya seluruh riwayat tetap bisa dibuka, berapa pun jumlahnya.
export function useLetters({
  page = 1,
  perPage = OWN_LETTERS_PER_PAGE,
  status,
  submittedFrom,
  submittedTo,
} = {}) {
  return useSuratListQuery({
    scope: 'mine',
    page,
    per_page: perPage,
    status,
    submitted_from: submittedFrom,
    submitted_to: submittedTo,
  })
}
