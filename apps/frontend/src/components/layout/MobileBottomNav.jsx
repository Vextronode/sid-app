import { Link, useLocation } from "react-router-dom";
import { MOBILE_ONLY_LINKS } from "@/lib/constants/navigation";

export function MobileBottomNav({
  links = MOBILE_ONLY_LINKS,
}) {
  const location = useLocation();

  return (
    <nav className="sid-mobile-nav">
      <div className="sid-mobile-nav-inner">
        {links.map((item) => {
          const isActive =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sid-mobile-nav-item ${
                isActive ? "active" : ""
              }`}
            >
              <Icon
                className="sid-mobile-nav-icon"
                strokeWidth={isActive ? 2 : 1.5}
              />

              <span className="sid-mobile-nav-label">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}