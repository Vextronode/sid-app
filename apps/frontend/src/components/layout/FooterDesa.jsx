// ==========================================
// FooterDesa.jsx
// 3 kolom: SID Cibenda / Kontak / Jam Operasional (kolom Alamat dihapus).
// Ukuran diperkecil, tidak full-width besar.
// ==========================================

import { Phone, Mail, Clock } from "lucide-react";

export function FooterDesa() {
  return (
    <footer className="w-full bg-[#185FA5] text-white mt-8">
      <div className="max-w-3xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
        <div>
          <h4 className="font-bold mb-2 uppercase tracking-wider text-[10px] opacity-90">
            SIDUTama
          </h4>
          <p className="text-gray-100/80 text-[11px]">Sistem Informasi Desa Cibenda</p>
        </div>

        <div>
          <h4 className="font-bold mb-2 uppercase tracking-wider text-[10px] opacity-90">
            KONTAK
          </h4>
          <div className="space-y-1.5 text-[11px] text-orang-100/80">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> <span>+62 812-3456-7890</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> <span>info@cibenda.desa.id</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-2 uppercase tracking-wider text-[10px] opacity-90">
            JAM OPERASIONAL
          </h4>
          <div className="flex items-start gap-1.5 text-[11px] text-gray-100/80">
            <Clock className="w-3.5 h-3.5 mt-0.5" />
            <span>Senin – Jumat, 08.00 – 16.00 WIB</span>
          </div>
        </div>
      </div>
      <div className="w-full text-center bg-orange-500 py-2 text-[10px] text-white-500 font-medium">
        Desa Cibenda - Kec. Parigi - Kab. Pangandaran - © 2026
      </div>
    </footer>
  );
}