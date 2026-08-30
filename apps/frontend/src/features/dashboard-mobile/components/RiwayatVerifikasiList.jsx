// ==========================================
// RiwayatVerifikasiList.jsx
// Tabel ringkas riwayat verifikasi terbaru di dashboard mobile.
// Styling menggunakan SID Global Theme.
// ==========================================

export default function RiwayatVerifikasiList({ data }) {
  return (
    <div className="sid-riwayat-verifikasi">
      <div className="sid-riwayat-verifikasi-header">
        <h3>Riwayat Verifikasi</h3>

        <button className="sid-riwayat-verifikasi-view-all">
          Lihat Semua
        </button>
      </div>

      <div className="sid-riwayat-verifikasi-columns">
        <span>WARGA</span>
        <span>JENIS SURAT</span>
      </div>

      <div className="sid-riwayat-verifikasi-list">
        {data.map((item) => (
          <div
            key={item.id}
            className="sid-riwayat-verifikasi-item"
          >
            <div className="sid-riwayat-verifikasi-citizen">
              <div className="sid-riwayat-verifikasi-avatar">
                {item.nama
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>

              <div className="sid-riwayat-verifikasi-citizen-info">
                <p className="sid-riwayat-verifikasi-name">
                  {item.nama}
                </p>

                <p className="sid-riwayat-verifikasi-nik">
                  NIK: {item.nik}
                </p>
              </div>
            </div>

            <div className="sid-riwayat-verifikasi-letter">
              <p className="sid-riwayat-verifikasi-letter-type">
                {item.jenisSurat}
              </p>

              <span className="sid-riwayat-verifikasi-date">
                {item.tanggal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}