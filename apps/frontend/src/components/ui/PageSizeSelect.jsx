import { PAGE_SIZE_OPTIONS } from './usePageSize'

// Pilihan jumlah baris per halaman di bar pagination.
export function PageSizeSelect({ value, onChange, options = PAGE_SIZE_OPTIONS, disabled = false }) {
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
