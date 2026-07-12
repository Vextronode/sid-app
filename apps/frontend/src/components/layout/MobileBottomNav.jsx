import { Link, useLocation } from "react-router-dom";
import { MOBILE_ONLY_LINKS } from "@/lib/constants/navigation";

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="flex md:hidden fixed bottom-0 w-full bg-[#4CAF4F] text-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-around items-center w-full h-16">
        {MOBILE_ONLY_LINKS.map((item) => {
          const isActive =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition ${
                isActive
                  ? "bg-white text-[#4CAF4F]"
                  : "text-white hover:bg-[#3d8c40]"
              }`}
            >
              <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
