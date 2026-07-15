// ==========================================
// ApprovalActionBar.jsx
// Baris tombol aksi di halaman detail surat: Setuju, Tolak, Kembali.
// Tombol Tolak tidak langsung eksekusi, tapi buka RejectReasonModal dulu
// lewat onReject yang dikontrol dari parent (ApprovalDetailPage).
// ==========================================

export default function ApprovalActionBar({ onApprove, onReject, onBack }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onApprove}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
      >
        ⌄ Setuju
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
      >
        ✕ Tolak
      </button>
      <button
        onClick={onBack}
        className="flex items-center gap-2 border border-green-500 text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50"
      >
        ✓ Kembali
      </button>
    </div>
  );
}