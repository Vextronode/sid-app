import { Link, useLocation } from "react-router-dom";
import { NAV_LINKS } from "@/lib/constants/navigation";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Bell, User, LogOut } from "lucide-react";

export function DesktopNavbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav className="hidden md:flex w-full bg-white shadow-md border-b-[3px] border-gray-100 py-4 px-8 items-center justify-between sticky top-0 z-50">
      <div className="font-bold text-2xl text-black">LOGO</div>

      <div className="flex gap-8 text-sm font-medium text-[#4CAF4F]">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.href);

          return (
            <Link
              key={link.name}
              to={link.href}
              className={`px-4 py-2 rounded-md transition ${
                isActive
                  ? "bg-[#4CAF4F]/50 text-white"
                  : "hover:bg-[#4CAF4F]/10"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-4 items-center">
        {user ? (
          // after login
          <div className="flex items-center gap-5">
            <button className="text-[#4CAF4F] hover:scale-105 transition">
              <Bell className="w-5 h-5" />
            </button>

            {/* Avatar & Nama User */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#4CAF4F]/10 border border-[#4CAF4F] flex items-center justify-center text-[#4CAF4F]">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {user.name}
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          // Guest atau puclic route
          <>
            <Link
              to="/login"
              className="text-[#4CAF4F] font-medium hover:text-[#3d8c40]"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#4CAF4F] text-white px-5 py-2 rounded-full font-medium hover:bg-[#3d8c40] transition"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
