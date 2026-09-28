// ==========================================
// PetugasDesaDashboardPage.jsx
//
// Petugas Desa:
// - Monitoring surat
// - Melihat surat yang sudah approved
// - Mencetak surat
// - Bukan approver
//
// Status menggunakan status generic.
// ==========================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, AlertCircle } from 'lucide-react'

import { getSuratList } from '@/features/approval/api'
import { RELEVANT_STATUSES, SURAT_STATUS } from '@/constants/suratStatus'

export default function PetugasDesaDashboardPage() {
  const navigate = useNavigate()

  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    let isMounted = true

    const loadLetters = async () => {
      try {
        setLoading(true)

        const response = await getSuratList('kasi')

        if (isMounted) {
          setLetters(Array.isArray(response.data?.data) ? response.data.data : [])
        }
      } catch (error) {
        console.error('GET PETUGAS DESA LETTER ERROR:', error.response?.data ?? error)

        if (isMounted) {
          setLetters([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLetters()

    return () => {
      isMounted = false
    }
  }, [])

  // ==========================================
  // STATISTIK
  // ==========================================

  const stats = useMemo(() => {
    const relevantLetters = letters.filter((letter) => RELEVANT_STATUSES.includes(letter.status))

    const siapCetak = relevantLetters.filter(
      (letter) => letter.status === SURAT_STATUS.APPROVED,
    ).length

    return {
      siapCetak,
      total: relevantLetters.length,
    }
  }, [letters])

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">Petugas Desa</h1>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
        <AlertCircle size={16} />

        <span>Surat siap dicetak setelah status surat menjadi disetujui.</span>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mb-6">
        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl font-semibold text-gray-800">
            {loading ? '-' : stats.siapCetak}
          </span>

          <span className="text-sm text-gray-500">Surat siap dicetak</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1">
          <span className="text-2xl font-semibold text-gray-800">
            {loading ? '-' : stats.total}
          </span>

          <span className="text-sm text-gray-500">Total Permohonan</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/admin/list-petugas-desa')}
        className="border border-green-500 text-green-600 rounded-full px-5 py-2 text-sm hover:bg-green-50 flex items-center gap-2"
      >
        <Printer size={16} />
        Lihat & Cetak Surat
      </button>
    </div>
  )
}
