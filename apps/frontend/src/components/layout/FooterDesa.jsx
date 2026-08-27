// ==========================================
// FooterDesa.jsx
// 3 kolom: SID Cibenda / Kontak / Jam Operasional.
// Styling menggunakan SID Global Theme.
// ==========================================

import { Phone, Mail, Clock } from "lucide-react";

export function FooterDesa() {
  return (
    <footer className="sid-footer">

      <div className="sid-footer-container">

        {/* SIDUTama */}
        <div className="sid-footer-column">
          <h4 className="sid-footer-title">
            SIDUTama
          </h4>

          <p className="sid-footer-description">
            Sistem Informasi Desa Cibenda
          </p>
        </div>


        {/* KONTAK */}
        <div className="sid-footer-column">
          <h4 className="sid-footer-title">
            Kontak
          </h4>

          <div className="sid-footer-contact-list">

            <div className="sid-footer-contact-item">
              <Phone className="sid-footer-icon" />
              <span>+62 812-3456-7890</span>
            </div>

            <div className="sid-footer-contact-item">
              <Mail className="sid-footer-icon" />
              <span>info@cibenda.desa.id</span>
            </div>

          </div>
        </div>


        {/* JAM OPERASIONAL */}
        <div className="sid-footer-column">
          <h4 className="sid-footer-title">
            Jam Operasional
          </h4>

          <div className="sid-footer-contact-item sid-footer-operational">
            <Clock className="sid-footer-icon" />

            <span>
              Senin – Jumat, 08.00 – 16.00 WIB
            </span>
          </div>
        </div>

      </div>


      {/* COPYRIGHT */}
      <div className="sid-footer-copyright">
        Desa Cibenda - Kec. Parigi - Kab. Pangandaran - © 2026
      </div>

    </footer>
  );
}