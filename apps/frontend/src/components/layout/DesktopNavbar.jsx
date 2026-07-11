import { Link, useLocation } from "react-router-dom";
import { NAV_LINKS } from "@/lib/constants/navigation";

export function DesktopNavbar() {
  const location = useLocation();

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
      </div>
    </nav>
  );
}
