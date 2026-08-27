
// ==========================================
// SidebarBerita.jsx
// Sidebar berita lain pada halaman detail berita publik.
// Styling menggunakan Global CSS SID.
// ==========================================

import { Link } from "react-router-dom";

export function SidebarBerita({ beritaLain }) {
  return (
    <aside className="sid-sidebar-berita">

      <h3 className="sid-sidebar-berita-title">
        berita lain
      </h3>

      <div className="sid-sidebar-berita-list">

        {beritaLain.map((item) => (
          <Link
            key={item.id}
            to={`/berita/${item.id}`}
            className="sid-sidebar-berita-item"
          >

            {/* Gambar berita */}
            <img
              src={item.imageUrl}
              alt={item.title}
              className="sid-sidebar-berita-image"
            />

            {/* Judul */}
            <h4 className="sid-sidebar-berita-item-title">
              {item.title}
            </h4>

            {/* Tanggal */}
            <span className="sid-sidebar-berita-date">
              {item.date}
            </span>

          </Link>
        ))}

      </div>

    </aside>
  );
}

