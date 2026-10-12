import { Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function RwTable({ rws, hamlets, processing, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [filterHamlet, setFilterHamlet] = useState('')

  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return rws.filter((rw) => {
      const matchesHamlet = filterHamlet ? String(rw.hamletId) === String(filterHamlet) : true

      const matchesSearch =
        !keyword ||
        String(rw.number).toLowerCase().includes(keyword) ||
        String(rw.fullLabel).toLowerCase().includes(keyword)

      return matchesHamlet && matchesSearch
    })
  }, [rws, search, filterHamlet])

  const getHamletName = (hamletId) => hamlets.find((hamlet) => hamlet.id === hamletId)?.name ?? '-'

  return (
    <div className="sid-wilayah-table-card">
      <div className="sid-wilayah-table-toolbar">
        <div>
          <h3>Master Data RW</h3>
          <p>Kelola RW berdasarkan dusun.</p>
        </div>

        <div className="sid-wilayah-toolbar-controls">
          <div className="sid-wilayah-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari RW..."
            />
          </div>

          <select
            value={filterHamlet}
            onChange={(event) => setFilterHamlet(event.target.value)}
            className="sid-wilayah-filter"
          >
            <option value="">Semua Dusun</option>
            {hamlets.map((hamlet) => (
              <option key={hamlet.id} value={hamlet.id}>
                {hamlet.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sid-wilayah-table-wrap">
        <table className="sid-wilayah-table">
          <thead>
            <tr>
              <th>No</th>
              <th>RW</th>
              <th>Dusun</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="sid-wilayah-empty">Belum ada data RW.</div>
                </td>
              </tr>
            ) : (
              data.map((rw, index) => (
                <tr key={rw.id}>
                  <td>{index + 1}</td>
                  <td className="sid-wilayah-name">RW {rw.number}</td>
                  <td>{getHamletName(rw.hamletId)}</td>
                  <td>
                    <span
                      className={`sid-wilayah-status ${
                        rw.isActive ? 'sid-wilayah-status-active' : 'sid-wilayah-status-inactive'
                      }`}
                    >
                      {rw.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="sid-wilayah-actions">
                      <button
                        type="button"
                        onClick={() => onEdit(rw)}
                        className="sid-wilayah-action sid-wilayah-action-edit"
                        title="Edit RW"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(rw)}
                        className="sid-wilayah-action sid-wilayah-action-delete"
                        title="Hapus RW"
                        disabled={processing === `delete-rw-${rw.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
