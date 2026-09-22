import { Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function DusunTable({ hamlets, rws, rts, processing, onEdit, onDelete }) {
  const [search, setSearch] = useState('')

  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return hamlets.filter((hamlet) => {
      if (!keyword) return true

      return (
        hamlet.name.toLowerCase().includes(keyword) || hamlet.code.toLowerCase().includes(keyword)
      )
    })
  }, [hamlets, search])

  const getRwCount = (hamletId) => rws.filter((rw) => rw.hamletId === hamletId).length

  const getRtCount = (hamletId) => {
    const rwIds = rws.filter((rw) => rw.hamletId === hamletId).map((rw) => rw.id)

    return rts.filter((rt) => rwIds.includes(rt.rwId)).length
  }

  return (
    <div className="sid-wilayah-table-card">
      <div className="sid-wilayah-table-toolbar">
        <div>
          <h3>Master Data Dusun</h3>
          <p>Kelola data dusun dalam desa.</p>
        </div>

        <div className="sid-wilayah-search">
          <Search size={16} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari dusun..."
          />
        </div>
      </div>

      <div className="sid-wilayah-table-wrap">
        <table className="sid-wilayah-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Nama Dusun</th>
              <th>RW</th>
              <th>RT</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="sid-wilayah-empty">Belum ada data dusun.</div>
                </td>
              </tr>
            ) : (
              data.map((hamlet, index) => (
                <tr key={hamlet.id}>
                  <td>{index + 1}</td>
                  <td className="sid-wilayah-code">{hamlet.code || '-'}</td>
                  <td className="sid-wilayah-name">{hamlet.name || '-'}</td>
                  <td>{getRwCount(hamlet.id)}</td>
                  <td>{getRtCount(hamlet.id)}</td>
                  <td>
                    <span
                      className={`sid-wilayah-status ${
                        hamlet.isActive
                          ? 'sid-wilayah-status-active'
                          : 'sid-wilayah-status-inactive'
                      }`}
                    >
                      {hamlet.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="sid-wilayah-actions">
                      <button
                        type="button"
                        onClick={() => onEdit(hamlet)}
                        className="sid-wilayah-action sid-wilayah-action-edit"
                        title="Edit Dusun"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(hamlet)}
                        className="sid-wilayah-action sid-wilayah-action-delete"
                        title="Hapus Dusun"
                        disabled={processing === `delete-hamlet-${hamlet.id}`}
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
