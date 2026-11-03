import type { ReactNode } from 'react'

import { useWilayahCascade } from '../hooks/useWilayahCascade'
import type { WilayahCascadeValue } from '../hooks/useWilayahCascade'

type Level = 'hamlet' | 'rw' | 'rt'

type FieldSlot = { id: string; label: string; control: ReactNode }

type WilayahCascadeFieldsProps = {
  // Tingkat terakhir yang dipilih: 'rw' (Dusun -> RW) atau 'rt' (Dusun -> RW -> RT).
  depth: 'rw' | 'rt'
  value: WilayahCascadeValue
  onChange: (value: WilayahCascadeValue) => void
  idPrefix: string
  required?: boolean
  disabled?: boolean
  selectClassName?: string
  selectStyle?: React.CSSProperties
  // Pilihan yang tidak bisa dipilih, mis. wilayah yang jabatannya sudah terisi.
  isTaken?: (level: Level, id: number) => boolean
  // Membungkus tiap isian sesuai gaya form pemakainya.
  renderField: (field: FieldSlot) => ReactNode
}

/**
 * Isian wilayah bertingkat Dusun -> RW -> RT. Pilihan tiap tingkat diambil
 * dari backend sesuai tingkat di atasnya; mengganti tingkat atas
 * mengosongkan tingkat di bawahnya.
 */
export function WilayahCascadeFields({
  depth,
  value,
  onChange,
  idPrefix,
  required,
  disabled,
  selectClassName,
  selectStyle,
  isTaken,
  renderField,
}: WilayahCascadeFieldsProps) {
  const withRt = depth === 'rt'
  const { hamlets, rws, rts, failed } = useWilayahCascade(value, withRt)

  const option = (level: Level, id: number, label: string) => {
    const taken = isTaken?.(level, id) ?? false

    return (
      <option key={id} value={String(id)} disabled={taken}>
        {taken ? `${label} (sudah ada)` : label}
      </option>
    )
  }

  const select = (
    id: string,
    current: string,
    onSelect: (next: string) => void,
    placeholder: string,
    options: ReactNode,
    enabled: boolean,
  ) => (
    <select
      id={id}
      required={required}
      disabled={disabled || !enabled}
      value={current}
      onChange={(event) => onSelect(event.target.value)}
      className={selectClassName}
      style={selectStyle}
    >
      <option value="">{placeholder}</option>
      {options}
    </select>
  )

  return (
    <>
      {renderField({
        id: `${idPrefix}-dusun`,
        label: 'Dusun',
        control: select(
          `${idPrefix}-dusun`,
          value.hamletId,
          (hamletId) => onChange({ hamletId, rwId: '', rtId: '' }),
          'Pilih dusun',
          hamlets.map((hamlet) => option('hamlet', hamlet.id, hamlet.name)),
          true,
        ),
      })}

      {renderField({
        id: `${idPrefix}-rw`,
        label: 'RW',
        control: select(
          `${idPrefix}-rw`,
          value.rwId,
          (rwId) => onChange({ ...value, rwId, rtId: '' }),
          value.hamletId ? 'Pilih RW' : 'Pilih dusun dulu',
          rws.map((rw) => option('rw', rw.id, `RW ${rw.number}`)),
          Boolean(value.hamletId),
        ),
      })}

      {withRt &&
        renderField({
          id: `${idPrefix}-rt`,
          label: 'RT',
          control: select(
            `${idPrefix}-rt`,
            value.rtId,
            (rtId) => onChange({ ...value, rtId }),
            value.rwId ? 'Pilih RT' : 'Pilih RW dulu',
            rts.map((rt) => option('rt', rt.id, `RT ${rt.number}`)),
            Boolean(value.rwId),
          ),
        })}

      {failed && (
        <p className="sid-form-field-error" role="alert">
          Data wilayah gagal dimuat. Tutup lalu buka lagi form ini.
        </p>
      )}
    </>
  )
}
