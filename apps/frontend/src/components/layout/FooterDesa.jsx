import { Phone, Mail, MapPin, Clock } from "lucide-react";

export function FooterDesa() {
  return (
    <footer className="w-full bg-[#4CAF4F] text-white mt-12">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-bold mb-3 uppercase tracking-wider text-xs opacity-90">
            SID CIBENDA
          </h4>
          <p className="text-gray-100/80 text-xs">deksripsi desa cibenda</p>
        </div>
        <div>
          <h4 className="font-bold mb-3 uppercase tracking-wider text-xs opacity-90">
            KONTAK
          </h4>
          <div className="space-y-2 text-xs text-gray-100/80">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" /> <span>no wa</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> <span>email</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3 uppercase tracking-wider text-xs opacity-90">
            ALAMAT LENGKAP
          </h4>
          <div className="flex items-start gap-2 text-xs text-gray-100/80">
            <MapPin className="w-4 h-4 mt-0.5" />
            <span>alamat lengkap kantor desa</span>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3 uppercase tracking-wider text-xs opacity-90">
            JAM OPERASIONAL
          </h4>
          <div className="flex items-start gap-2 text-xs text-gray-100/80">
            <Clock className="w-4 h-4 mt-0.5" />
            <span>deksripsi jam kerja pelayanan</span>
          </div>
        </div>
      </div>
      <div className="w-full text-center bg-gray-200 py-3 text-[11px] text-gray-500 font-medium">
        Desa Cibenda - Kec. Parigi - Kab. Pangandaran - © 2026
      </div>
    </footer>
  );
}
