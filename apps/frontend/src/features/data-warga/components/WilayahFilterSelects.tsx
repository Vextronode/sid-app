/**
 * Tiga pilihan filter bertingkat Dusun -> RW -> RT, untuk diletakkan di
 * grid filter (.warga-filter) bersama kolom pencarian. Datanya dari
 * useWilayahFilter. `levels` memilih tingkat yang tampil (bawaan: semua).
 */
import { ALL_WILAYAH_LEVELS } from '../hooks/useWilayahFilter'
import type { FilterOption, WilayahFilters } from '../hooks/useWilayahFilter'

type WilayahFilterSelectsProps = {
  filters: WilayahFilters
  setFilter: (level: keyof WilayahFilters, value: string) => void
  hamletOptions: FilterOption[]
  rwOptions: FilterOption[]
  rtOptions: FilterOption[]
  levels?: (keyof WilayahFilters)[]
}

type FilterField = {
  level: keyof WilayahFilters
  label: string
  all: string
  options: FilterOption[]
}

export function WilayahFilterSelects({
  filters,
  setFilter,
  hamletOptions,
  rwOptions,
  rtOptions,
  levels = ALL_WILAYAH_LEVELS,
}: WilayahFilterSelectsProps) {
  const fields: FilterField[] = [
    { level: 'hamletId', label: 'Dusun', all: 'Semua Dusun', options: hamletOptions },
    { level: 'rwId', label: 'RW', all: 'Semua RW', options: rwOptions },
    { level: 'rtId', label: 'RT', all: 'Semua RT', options: rtOptions },
  ]

  return fields
    .filter((filter) => levels.includes(filter.level))
    .map((filter) => (
      <div key={filter.level} className="sid-operator-filter-field">
        <p>{filter.label}</p>
        <select
          aria-label={`Filter ${filter.label}`}
          value={filters[filter.level]}
          onChange={(event) => setFilter(filter.level, event.target.value)}
        >
          <option value="">{filter.all}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ))
}
