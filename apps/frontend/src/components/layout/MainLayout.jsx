import { DesktopNavbar } from "./DesktopNavbar";
import { MobileBottomNav } from "./MobileBottomNav";

export function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 md:pb-0">
      <DesktopNavbar />

      <main className="grow w-full">{children}</main>

      <MobileBottomNav />
    </div>
  );
}
