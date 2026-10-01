import OrganisasiManager from '@/features/organisasi/components/OrganisasiManager'

export default function OrganisasiBpdPage() {
  return (
    <OrganisasiManager
      title="Badan Permusyawaratan Desa (BPD)"
      subtitle="Kelola jabatan dan anggota BPD."
      orgTypes={[{ value: 'bpd', label: 'BPD' }]}
    />
  )
}
