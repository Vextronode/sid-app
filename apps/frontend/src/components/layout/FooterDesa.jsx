// ==========================================
// FooterDesa.jsx
// 3 kolom: SID Cibenda / Kontak / Jam Operasional (kolom Alamat dihapus).
// Ukuran diperkecil, tidak full-width besar.
// ==========================================

import { Phone, Mail, Clock } from "lucide-react";

export function FooterDesa() {
  return (
    <footer className="w-full bg-[#4CAF4F] text-white">
        <div className="w-full text-center bg-gray-100 py-2 text-[10px] text-gray-500 font-medium">
            Desa Cibenda - Kec. Parigi - Kab. Pangandaran - © 2026
        </div>
    </footer>
  );
}