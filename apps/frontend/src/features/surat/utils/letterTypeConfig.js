import { SURAT_CONFIG } from '@/lib/constants/suratConfig'

export function getLetterTypeFormConfig(letterType) {
  if (!letterType?.code) return null

  const formConfig = SURAT_CONFIG[letterType.code]
  if (!formConfig) return null

  return {
    ...formConfig,
    id: letterType.id,
    code: letterType.code,
    title: letterType.name,
    type: letterType.verification_type ?? formConfig.type,
    category: letterType.category,
    requirementsInfo: letterType.requirements_info,
  }
}
