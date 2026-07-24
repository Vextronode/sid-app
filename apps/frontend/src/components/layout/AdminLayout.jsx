import { Bell, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function AdminLayout({ children, menuItems }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-gray-800">
          LOGO
        </Link>

        {/* Kalau menuItems dikasih (misal Petugas Desa), render menu horizontal.
            Kalau tidak, tampilkan judul "Dashboard" statis kayak sebelumnya. */}
        {menuItems ? (
          <div className="flex items-center gap-8">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm ${isActive ? 'text-green-600 font-medium' : 'text-gray-600 hover:text-green-600'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <span className="text-green-600 font-medium">Dashboard</span>
        )}

        <div className="flex items-center gap-4">
          <button className="text-green-600 hover:text-green-700">
            <Bell size={20} />
          </button>
          <div className="w-9 h-9 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600">
            <User size={18} />
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}