// ==========================================
// PageWatermark.jsx
// Watermark logo fixed di background halaman, opacity rendah, di belakang
// semua konten (z-index rendah + pointer-events-none supaya nggak
// ganggu klik). Tetap kelihatan meski ada card/form di atasnya karena
// posisinya fixed, bukan ikut scroll bareng konten.
// ==========================================

export function PageWatermark() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
      aria-hidden="true"
    >
      <img
        src="/assets/watermark-logo.jpg"
        alt=""
        className="w-64 md:w-96 opacity-[0.06] object-contain"
      />
    </div>
  );
}