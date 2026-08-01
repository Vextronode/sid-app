// ==========================================
// HelpCenterModal.jsx
// Popup "Pusat Bantuan" untuk Warga: kontak, alamat, jam operasional
// desa. Dibuka dari ikon Pusat Bantuan di navbar WargaLayout.
// ==========================================

import { X, Phone, Mail, MapPin, Clock, HelpCircle } from 'lucide-react';

export default function HelpCenterModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md relative max-h-[85vh] overflow-y-auto">
        <div className="bg-green-600 text-white p-6 rounded-t-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={20} />
          </button>
          <HelpCircle size={28} className="mb-2" />
          <h2 className="font-bold text-lg">Pusat Bantuan</h2>
          <p className="text-sm text-green-50">Butuh bantuan? Hubungi kami lewat kanal berikut.</p>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Telepon / WhatsApp</p>
              <p className="text-sm font-semibold text-gray-800">+62 812-3456-7890</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-semibold text-gray-800">info@cibenda.desa.id</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Alamat Kantor Desa</p>
              <p className="text-sm font-semibold text-gray-800">Jl. Raya Parigi No. 123, Cibenda, Parigi, Pangandaran</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Jam Operasional</p>
              <p className="text-sm font-semibold text-gray-800">Senin – Jumat, 08.00 – 16.00 WIB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full border border-green-500 text-green-600 rounded-lg py-2.5 text-sm font-medium hover:bg-green-50 mt-2"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
