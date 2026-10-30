/**
 * Tiga pilihan filter bertingkat Dusun -> RW -> RT, untuk diletakkan di
 * grid filter (.warga-filter) bersama kolom pencarian. Datanya dari
 * useWilayahFilter.
 */
export function WilayahFilterSelects({ filters, setFilter, hamletOptions, rwOptions, rtOptions }) {
  return [
    { level: 'hamletId', label: 'Dusun', all: 'Semua Dusun', options: hamletOptions },
    { level: 'rwId', label: 'RW', all: 'Semua RW', options: rwOptions },
    { level: 'rtId', label: 'RT', all: 'Semua RT', options: rtOptions },
  ].map((filter) => (
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
