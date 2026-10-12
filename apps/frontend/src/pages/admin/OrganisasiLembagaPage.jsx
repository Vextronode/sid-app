import OrganisasiManager from '@/features/organisasi/components/OrganisasiManager'

export default function OrganisasiLembagaPage() {
  return (
    <OrganisasiManager
      title="Lembaga Kemasyarakatan Desa"
      subtitle="Kelola jabatan dan anggota LPM, Karang Taruna, dan PKK."
      orgTypes={[
        { value: 'lpm', label: 'LPM' },
        { value: 'karang_taruna', label: 'Karang Taruna' },
        { value: 'pkk', label: 'PKK' },
      ]}
    />
  )
}
