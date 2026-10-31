import { PAGE_SIZE_OPTIONS } from './usePageSize'

type PageSizeSelectProps = {
  value: number
  onChange: (size: number) => void
  options?: readonly number[]
  disabled?: boolean
}

// Pilihan jumlah baris per halaman di bar pagination.
export function PageSizeSelect({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS,
  disabled = false,
}: PageSizeSelectProps) {
  return (
    <label className="sid-page-size">
      <span>Baris per halaman</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
