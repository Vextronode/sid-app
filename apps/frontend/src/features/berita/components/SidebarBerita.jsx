import { Link } from 'react-router-dom'

// Daftar berita lain di samping detail berita. Gaya dari public.css (kelas pb-*).
export function SidebarBerita({ beritaLain }) {
  return (
    <aside className="pb-sidebar">
      <h3 className="pb-aside-title">berita lain</h3>

      <div className="pb-sidebar-list">
        {beritaLain.map((item) => (
          <Link key={item.id} to={`/berita/${item.id}`} className="pb-sidebar-item">
            {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
            <h4>{item.title}</h4>
            <span className="pb-sidebar-date">{item.date}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
