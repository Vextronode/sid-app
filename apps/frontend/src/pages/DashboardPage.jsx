import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">
          Halo, {user ? user.name : "Tamu"}!
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Ini halaman dashboard dummy untuk ngetes logic logout.
        </p>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors cursor-pointer"
        >
          Keluar (Logout)
        </button>
      </div>
    </div>
  );
}
