/* eslint-disable no-unused-vars */
import { Home, Info, Newspaper, FileText, Bell, User } from "lucide-react";

export const NAV_LINKS = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "Profil Desa", href: "/profil-desa", icon: Info },
  { name: "Berita", href: "/berita", icon: Newspaper },
];

export const MOBILE_ONLY_LINKS = [
   { name: "Beranda", href: "/", icon: Home },
   { name: "Profil Desa", href: "/profil-desa", icon: Info },
   { name: "Berita", href: "/berita", icon: Newspaper },
 ];

// Bottom nav khusus admin (RT/RW/dll), cuma 2 menu sesuai desain
 export const ADMIN_MOBILE_LINKS = (dashboardPath, listPath) => [
   { name: "Beranda", href: dashboardPath, icon: Home },
   { name: "Surat", href: listPath, icon: FileText },
 ];

 export const WARGA_MOBILE_LINKS = [
  { name: "Beranda", href: "/daftar-surat", icon: Home },
  { name: "Surat", href: "/jenis-surat", icon: FileText },
  { name: "Profil", href: "/profile", icon: User },
];
