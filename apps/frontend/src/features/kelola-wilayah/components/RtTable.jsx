import { Pencil, Power, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusPill } from '@/components/ui/StatusPill'

export default function RtTable({ rts, rws, hamlets, processing, onEdit, onToggle, onDelete }) {
  const [search, setSearch] = useState('')
  const [filterHamlet, setFilterHamlet] = useState('')
  const [filterRw, setFilterRw] = useState('')

  // Pilihan RW mengikuti dusun yang dipilih.
  const rwOptions = useMemo(
    () => (filterHamlet ? rws.filter((rw) => String(rw.hamletId) === filterHamlet) : rws),
    [rws, filterHamlet],
  )

  const changeHamlet = (value) => {
    setFilterHamlet(value)
    setFilterRw('')
  }

  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const rwIdsInHamlet = new Set(rwOptions.map((rw) => String(rw.id)))

    return rts.filter((rt) => {
      const matchesHamlet = filterHamlet ? rwIdsInHamlet.has(String(rt.rwId)) : true
      const matchesRw = filterRw ? String(rt.rwId) === String(filterRw) : true

      const matchesSearch =
        !keyword ||
        String(rt.number).toLowerCase().includes(keyword) ||
        String(rt.fullLabel).toLowerCase().includes(keyword)

      return matchesHamlet && matchesRw && matchesSearch
    })
  }, [rts, rwOptions, search, filterHamlet, filterRw])

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
          <p>Kelola RT berdasarkan dusun dan RW.</p>
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
            value={filterHamlet}
            onChange={(event) => changeHamlet(event.target.value)}
            className="sid-wilayah-filter"
            aria-label="Filter dusun"
          >
            <option value="">Semua Dusun</option>

            {hamlets.map((hamlet) => (
              <option key={hamlet.id} value={hamlet.id}>
                {hamlet.name}
              </option>
            ))}
          </select>

          <select
            value={filterRw}
            onChange={(event) => setFilterRw(event.target.value)}
            className="sid-wilayah-filter"
            aria-label="Filter RW"
          >
            <option value="">Semua RW</option>

            {rwOptions.map((rw) => (
              <option key={rw.id} value={rw.id}>
                RW {rw.number}
                {!filterHamlet &&
                  ` — ${hamlets.find((hamlet) => hamlet.id === rw.hamletId)?.name ?? 'Dusun'}`}
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
                  <div className="sid-wilayah-empty">
                    {rts.length === 0
                      ? 'Belum ada data RT.'
                      : 'Tidak ada RT yang cocok dengan filter.'}
                  </div>
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
                      <StatusPill active={rt.isActive}>
                        {rt.isActive ? 'Aktif' : 'Nonaktif'}
                      </StatusPill>
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
                          onClick={() => onToggle(rt)}
                          className="sid-wilayah-action sid-wilayah-action-toggle"
                          title={rt.isActive ? 'Nonaktifkan RT' : 'Aktifkan RT'}
                          aria-label={rt.isActive ? 'Nonaktifkan RT' : 'Aktifkan RT'}
                          disabled={processing === `update-rt-${rt.id}`}
                        >
                          <Power size={15} />
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
