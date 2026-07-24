import { Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminNavbar() {
  return (
    <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg text-gray-800">
        LOGO
      </Link>

      <span className="text-green-600 font-medium">Dashboard</span>

      <div className="flex items-center gap-4">
        <button className="text-green-600 hover:text-green-700">
          <Bell size={20} />
        </button>
        <div className="w-9 h-9 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600">
          <User size={18} />
        </div>
      </div>
    </nav>
  );
}