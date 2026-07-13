import { Home, Info, Newspaper, FileText, Bell, User } from "lucide-react";

export const NAV_LINKS = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "Profil Desa", href: "/profil-desa", icon: Info },
  { name: "Berita", href: "/berita", icon: Newspaper },
  { name: "Info Surat", href: "/info-surat", icon: FileText },
];

export const MOBILE_ONLY_LINKS = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "Jenis Surat", href: "/jenis-surat", icon: FileText },
  { name: "Notifikasi", href: "/notifikasi", icon: Bell },
  { name: "Profile", href: "/profile", icon: User },
];
