import { useState } from "react";
import { X, Send } from "lucide-react";
import api from "@/lib/api";

export function ResubmitSuratModal({
  data,
  onClose,
  onSuccess,
}) {
  const [purpose, setPurpose] = useState(data?.keperluan || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!purpose.trim()) {
      setError("Keperluan tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/api/letters/${data.id}/resubmit`, {
        purpose,
        notes,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat mengirim ulang surat."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sid-modal-overlay">

      {/* =========================
          MODAL
      ========================= */}
      <div className="sid-modal">

        {/* =========================
            CLOSE
        ========================= */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="sid-modal-close"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>


        {/* =========================
            HEADER
        ========================= */}
        <div className="sid-modal-header">
          <h2 className="sid-modal-title">
            Kirim Ulang Revisi
          </h2>

          <p className="sid-modal-subtitle">
            Perbarui data surat sebelum dikirim kembali.
          </p>
        </div>


        {/* =========================
            CONTENT
        ========================= */}
        <div className="sid-modal-section">

          {/* ERROR */}
          {error && (
            <div className="sid-modal-alert-error">
              {error}
            </div>
          )}


          {/* INFO REVISI */}
          <div className="sid-modal-alert-warning">
            <p className="font-semibold mb-1">
              Surat ini memerlukan revisi.
            </p>

            <p className="text-xs leading-relaxed">
              Silakan perbarui keperluan atau tambahkan
              catatan sebelum mengirim kembali surat kepada
              operator desa.
            </p>
          </div>


          {/* =========================
              FORM
          ========================= */}
          <form
            id="resubmit-form"
            onSubmit={handleSubmit}
          >

            {/* KEPERLUAN */}
            <div className="sid-form-group">
              <label className="sid-label">
                Keperluan Surat *
              </label>

              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                className="sid-modal-textarea"
                placeholder="Masukkan keperluan surat yang sudah direvisi..."
                required
              />
            </div>


            {/* CATATAN */}
            <div className="sid-form-group">
              <label className="sid-label">
                Catatan Tambahan (Opsional)
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="sid-modal-textarea"
                placeholder="Misal: Saya sudah memperbaiki bagian keperluan..."
              />
            </div>

          </form>

        </div>


        {/* =========================
            FOOTER
        ========================= */}
        <div className="sid-modal-footer">
          <div className="sid-modal-actions">

            {/* BATAL */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="sid-btn sid-btn-secondary"
            >
              Batal
            </button>


            {/* KIRIM ULANG */}
            <button
              type="submit"
              form="resubmit-form"
              disabled={loading}
              className="sid-btn sid-btn-primary"
            >
              {loading ? (
                <>
                  <span className="sid-loading-spinner" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Ulang
                </>
              )}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}