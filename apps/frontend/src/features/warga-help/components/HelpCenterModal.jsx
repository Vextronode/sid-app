// ==========================================
// HelpCenterModal.jsx
// Popup "Pusat Bantuan" untuk Warga: kontak, alamat, jam operasional
// desa. Dibuka dari ikon Pusat Bantuan di navbar WargaLayout.
// ==========================================

import {
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
} from "lucide-react";

export default function HelpCenterModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="sid-help-modal-overlay">
      <div className="sid-help-modal">

        {/* =========================
            HEADER
        ========================= */}
        <div className="sid-help-modal-header">
          <button
            onClick={onClose}
            className="sid-help-modal-close"
            aria-label="Tutup pusat bantuan"
          >
            <X size={20} />
          </button>

          <HelpCircle size={28} className="sid-help-modal-icon" />

          <h2 className="sid-help-modal-title">
            Pusat Bantuan
          </h2>

          <p className="sid-help-modal-subtitle">
            Butuh bantuan? Hubungi kami lewat kanal berikut.
          </p>
        </div>


        {/* =========================
            CONTENT
        ========================= */}
        <div className="sid-help-modal-content">

          {/* TELEPON */}
          <div className="sid-help-item">
            <div className="sid-help-item-icon">
              <Phone size={16} />
            </div>

            <div className="sid-help-item-content">
              <p className="sid-help-item-label">
                Telepon / WhatsApp
              </p>

              <p className="sid-help-item-value">
                +62 812-3456-7890
              </p>
            </div>
          </div>


          {/* EMAIL */}
          <div className="sid-help-item">
            <div className="sid-help-item-icon">
              <Mail size={16} />
            </div>

            <div className="sid-help-item-content">
              <p className="sid-help-item-label">
                Email
              </p>

              <p className="sid-help-item-value">
                info@cibenda.desa.id
              </p>
            </div>
          </div>


          {/* ALAMAT */}
          <div className="sid-help-item">
            <div className="sid-help-item-icon">
              <MapPin size={16} />
            </div>

            <div className="sid-help-item-content">
              <p className="sid-help-item-label">
                Alamat Kantor Desa
              </p>

              <p className="sid-help-item-value">
                Jl. Raya Parigi No. 123, Cibenda, Parigi,
                Pangandaran
              </p>
            </div>
          </div>


          {/* JAM OPERASIONAL */}
          <div className="sid-help-item">
            <div className="sid-help-item-icon">
              <Clock size={16} />
            </div>

            <div className="sid-help-item-content">
              <p className="sid-help-item-label">
                Jam Operasional
              </p>

              <p className="sid-help-item-value">
                Senin – Jumat, 08.00 – 16.00 WIB
              </p>
            </div>
          </div>


          {/* TUTUP */}
          <button
            onClick={onClose}
            className="sid-btn sid-btn-secondary sid-btn-full sid-help-close-button"
          >
            Tutup
          </button>

        </div>
      </div>
    </div>
  );
}