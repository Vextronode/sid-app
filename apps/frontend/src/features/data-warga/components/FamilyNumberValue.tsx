import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealFamilyNumber } from '@/shared/lib/identityApi'
import type { Citizen } from '@/types'

/** No. KK warga yang tersamar, dengan tombol tampilkan; '-' bila belum ber-KK. */
export function FamilyNumberValue({ family }: { family: Citizen['family'] }) {
  if (!family) return '-'

  return (
    <RevealableValue
      masked={family.no_kk_masked}
      reveal={() => revealFamilyNumber(family.id)}
      label="No. KK"
    />
  )
}
