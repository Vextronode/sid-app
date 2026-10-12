import { Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function RtTable({ rts, rws, hamlets, processing, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [filterRw, setFilterRw] = useState('')

  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return rts.filter((rt) => {
      const matchesRw = filterRw ? String(rt.rwId) === String(filterRw) : true

      const matchesSearch =
        !keyword ||
        String(rt.number).toLowerCase().includes(keyword) ||
        String(rt.fullLabel).toLowerCase().includes(keyword)

      return matchesRw && matchesSearch
    })
  }, [rts, search, filterRw])

  const getRw = (rwId) => rws.find((rw) => rw.id === rwId)

  const getHamletName = (rwId) => {
    const rw = getRw(rwId)

    return hamlets.find((hamlet) => hamlet.id === rw?.hamletId)?.name ?? '-'
  }

  return (
    <div className="sid-wilayah-table-card">
      <div className="sid-wilayah-table-toolbar">
        <div>
          <h3>Master Data RT</h3>
          <p>Kelola RT berdasarkan RW.</p>
        </div>

        <div className="sid-wilayah-toolbar-controls">
          <div className="sid-wilayah-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari RT..."
            />
          </div>

          <select
            value={filterRw}
            onChange={(event) => setFilterRw(event.target.value)}
            className="sid-wilayah-filter"
          >
            <option value="">Semua RW</option>

            {rws.map((rw) => (
              <option key={rw.id} value={rw.id}>
                RW {rw.number} —{' '}
                {hamlets.find((hamlet) => hamlet.id === rw.hamletId)?.name ?? 'Dusun'}
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
              <th>RT</th>
              <th>RW</th>
              <th>Dusun</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="sid-wilayah-empty">Belum ada data RT.</div>
                </td>
              </tr>
            ) : (
              data.map((rt, index) => {
                const rw = getRw(rt.rwId)

                return (
                  <tr key={rt.id}>
                    <td>{index + 1}</td>
                    <td className="sid-wilayah-name">RT {rt.number}</td>
                    <td>{rw ? `RW ${rw.number}` : '-'}</td>
                    <td>{getHamletName(rt.rwId)}</td>
                    <td>
                      <span
                        className={`sid-wilayah-status ${
                          rt.isActive ? 'sid-wilayah-status-active' : 'sid-wilayah-status-inactive'
                        }`}
                      >
                        {rt.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="sid-wilayah-actions">
                        <button
                          type="button"
                          onClick={() => onEdit(rt)}
                          className="sid-wilayah-action sid-wilayah-action-edit"
                          title="Edit RT"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(rt)}
                          className="sid-wilayah-action sid-wilayah-action-delete"
                          title="Hapus RT"
                          disabled={processing === `delete-rt-${rt.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
