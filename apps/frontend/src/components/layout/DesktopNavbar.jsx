// ==========================================
// DesktopNavbar.jsx
// Navbar publik untuk Beranda, Profil Desa, dan Berita.
// Styling menggunakan Global CSS SID.
// Logic/API tidak diubah.
// ==========================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAV_LINKS } from '@/lib/constants/navigation';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { User, LogOut } from 'lucide-react';

export function DesktopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <nav className="sid-desktop-navbar-loading" />
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout gagal', error);
    }
  };

  return (
    <nav className="sid-desktop-navbar">

      {/* ==========================================
          LOGO
          ========================================== */}

      <div className="sid-desktop-navbar-logo">
        LOGO
      </div>


      {/* ==========================================
          NAVIGATION
          ========================================== */}

      <div className="sid-desktop-navbar-menu">

        {NAV_LINKS.map((link) => {

          const isActive =
            link.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(link.href);

          return (
            <Link
              key={link.name}
              to={link.href}
              className={`sid-desktop-navbar-link ${
                isActive
                  ? 'active'
                  : ''
              }`}
            >
              {link.name}
            </Link>
          );
        })}

      </div>


      {/* ==========================================
          USER / LOGIN
          ========================================== */}

      <div className="sid-desktop-navbar-actions">

        {user ? (

          <div className="sid-desktop-navbar-user">

            <div className="sid-desktop-navbar-user-info">

              <div className="sid-desktop-navbar-user-avatar">
                <User size={16} />
              </div>

              <span>
                {user.name}
              </span>

            </div>


            <button
              onClick={handleLogout}
              className="sid-desktop-navbar-logout"
            >
              <LogOut size={14} />
              <span>Keluar</span>
            </button>

          </div>

        ) : (

          <Link
            to="/login"
            className="sid-desktop-navbar-login"
          >
            Masuk
          </Link>

        )}

      </div>

    </nav>
  );
}