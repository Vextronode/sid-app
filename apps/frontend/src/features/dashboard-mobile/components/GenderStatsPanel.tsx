import { useQuery } from '@tanstack/react-query'

import { getGenderStats } from '@/features/approval/api'
import GenderStatCard from '@/features/operator-desa/components/GenderStatCard'

const EMPTY_GENDER_STATS = { total: 0, laki: 0, perempuan: 0 }

/**
 * Jumlah warga aktif menurut jenis kelamin, dalam cakupan Data Penduduk
 * pengguna (dihitung backend): Staf, Kasi, Kaur, Kades, dan Sekdes se-desa;
 * Kadus dusunnya; RW dan RT wilayahnya.
 */
export default function GenderStatsPanel() {
  const { data = EMPTY_GENDER_STATS } = useQuery({
    queryKey: ['dashboard', 'gender-stats'],
    queryFn: async () => (await getGenderStats()).data?.data ?? EMPTY_GENDER_STATS,
    staleTime: 5 * 60 * 1000,
  })

  return <GenderStatCard total={data.total} laki={data.laki} perempuan={data.perempuan} />
}
