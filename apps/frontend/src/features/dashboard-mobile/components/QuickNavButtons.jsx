// ==========================================
// QuickNavButtons.jsx
// Navigasi cepat berdasarkan status surat.
// Styling menggunakan SID Global Theme.
// ==========================================

import {
  Clock,
  CheckCircle2,
  XCircle,
  ListFilter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ==========================================
// IKON & WARNA KATEGORI
// ==========================================

const ICON_MAP = {
  Menunggu: {
    icon: Clock,
    className: 'sid-quick-nav-icon-waiting',
  },

  Disetujui: {
    icon: CheckCircle2,
    className: 'sid-quick-nav-icon-approved',
  },

  Ditolak: {
    icon: XCircle,
    className: 'sid-quick-nav-icon-rejected',
  },

  Semua: {
    icon: ListFilter,
    className: 'sid-quick-nav-icon-all',
  },
};

// ==========================================
// COMPONENT
// ==========================================

export default function QuickNavButtons({ items, basePath }) {
  const navigate = useNavigate();

  return (
    <div className="sid-quick-nav">
      <div className="sid-quick-nav-grid">
        {items.map((item) => {
          const config =
            ICON_MAP[item.label] ?? ICON_MAP.Semua;

          const Icon = config.icon;

          return (
            <button
              key={item.label}
              onClick={() =>
                navigate(`${basePath}?status=${item.key}`)
              }
              className="sid-quick-nav-item"
            >
              <div
                className={`sid-quick-nav-icon ${config.className}`}
              >
                <Icon size={18} />
              </div>

              <span className="sid-quick-nav-label">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}