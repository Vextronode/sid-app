import { useEffect, useState } from "react";
import { Check, Clock, ChevronLeft, X, FileText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { previewSuratPDF } from "@/features/cetak-surat/utils/generateSuratPDF";

const ProgressTracker = ({ status, tanggal }) => {
  
  const currentStatus = status.toLowerCase();
  
  const isRtRejected = currentStatus === "rt_rejected";
  const isRtDone = [
    "rt_approved",
    "rw_approved",
    "kasi_approved",
  ].includes(currentStatus);

  const isRwRejected = currentStatus === "rw_rejected";
  const isRwDone = [
    "rw_approved",
    "kasi_approved",
  ].includes(currentStatus);

const isSelesaiRejected =
  currentStatus === "kasi_rejected";

const isSelesaiDone =
  currentStatus === "kasi_approved";

  return (
    
    <div className="relative flex justify-between items-start w-full max-w-sm py-4">
      <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0"></div>

      {/* Submit */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-2">
        <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-sm">
          <Check className="w-5 h-5" strokeWidth={3} />
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Submit</p>
          <p className="text-[10px] text-gray-400">{tanggal}</p>
        </div>
      </div>

      {/* RT */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isRtRejected ? "bg-red-500 text-white" : isRtDone ? "bg-[#16A34A] text-white" : "bg-white border-2 border-gray-800 text-gray-800"}`}
        >
          {isRtRejected ? (
            <X className="w-5 h-5" strokeWidth={3} />
          ) : isRtDone ? (
            <Check className="w-5 h-5" strokeWidth={3} />
          ) : (
            <Clock className="w-4 h-4" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">RT</p>
          <p
            className={`text-[10px] ${isRtRejected ? "text-red-500 font-medium" : "text-gray-400"}`}
          >
            {isRtRejected ? "Ditolak" : isRtDone ? "Selesai" : "Menunggu"}
          </p>
        </div>
      </div>

      {/* RW */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isRwRejected ? "bg-red-500 text-white" : isRwDone ? "bg-[#16A34A] text-white" : isRtDone && !isRtRejected ? "bg-white border-2 border-gray-800 text-gray-800" : "bg-white border-2 border-gray-200 text-gray-300"}`}
        >
          {isRwRejected ? (
            <X className="w-5 h-5" strokeWidth={3} />
          ) : isRwDone ? (
            <Check className="w-5 h-5" strokeWidth={3} />
          ) : isRtDone && !isRtRejected ? (
            <Clock className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">3</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">RW</p>
          <p
            className={`text-[10px] ${isRwRejected ? "text-red-500 font-medium" : "text-gray-400"}`}
          >
            {isRwRejected
              ? "Ditolak"
              : !isRtDone || isRtRejected
                ? "-"
                : isRwDone
                  ? "Selesai"
                  : "Menunggu"}
          </p>
        </div>
      </div>

      {/* Selesai */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isSelesaiRejected ? "bg-red-500 text-white" : isSelesaiDone ? "bg-[#16A34A] text-white" : isRwDone && !isRwRejected ? "bg-white border-2 border-gray-800 text-gray-800" : "bg-white border-2 border-gray-200 text-gray-300"}`}
        >
          {isSelesaiRejected ? (
            <X className="w-5 h-5" strokeWidth={3} />
          ) : isSelesaiDone ? (
            <Check className="w-5 h-5" strokeWidth={3} />
          ) : isRwDone && !isRwRejected ? (
            <Clock className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">4</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Selesai</p>
          <p
            className={`text-[10px] ${isSelesaiRejected ? "text-red-500 font-medium" : "text-gray-400"}`}
          >
            {isSelesaiRejected ? "Ditolak" : isSelesaiDone ? "Selesai" : "-"}
          </p>
        </div>
      </div>
    </div>
  );
};

// Preview PDF Surat (read-only, sama seperti Operator Desa)
const SuratPreview = ({ suratId, status }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadError, setLoadError] = useState(false);
const canPreview = status === "kasi_approved";
  useEffect(() => {
    if (!suratId || !showPreview) return;

    let url;
    setLoadError(false);

    const template = status === 'kasi_approved' ? 'digital' : 'wet';

    previewSuratPDF({ id: suratId }, template)
      .then((blobUrl) => {
        url = blobUrl;
        setPreviewUrl(blobUrl);
      })
      .catch(() => {
        setLoadError(true);
      });

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [suratId, showPreview, status]);

  return (
    <div className="space-y-3">
<button
  disabled={!canPreview}
  onClick={() => {
    if (canPreview) {
      setShowPreview((prev) => !prev);
    }
  }}
  className={`
    inline-flex items-center gap-2
    px-4 py-2.5
    rounded-lg
    border
    text-sm
    font-medium
    w-full
    justify-center
    transition

    ${
      canPreview
        ? "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
        : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
    }
  `}
>
  <FileText className="w-4 h-4" />

  {canPreview
    ? showPreview
      ? "Sembunyikan Preview Surat"
      : "Lihat Preview Surat"
    : "Preview tersedia setelah surat selesai"}
</button>

      {showPreview && (
        <div className="relative border rounded-lg overflow-hidden h-[500px] bg-gray-100">
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <FileText className="w-8 h-8" />
              <p className="text-sm">Gagal memuat preview surat</p>
            </div>
          ) : previewUrl ? (
            <>
              <iframe
                src={
                  previewUrl +
                  "#toolbar=0&navpanes=0&scrollbar=0"
                }
                title="Preview Surat"
                className="w-full h-full pointer-events-none select-none"
              />

              {/* Overlay supaya benar-benar tidak bisa diklik */}
              <div className="absolute inset-0 bg-transparent" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" />
                <p className="text-sm">Memuat preview...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Detail Informasi
const DetailInfo = ({ data }) => {
  const namaPanjangSurat = {
    SKD: "Surat Keterangan Domisili",
    SKTM: "Surat Keterangan Tidak Mampu",
    SKU: "Surat Keterangan Usaha",
  };

  return (
    <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[160px_1fr] gap-y-3 text-sm">
      <div className="text-gray-400">Nama Pemohon</div>
      <div className="text-gray-800 font-medium">{data.pemohon || "-"}</div>
      <div className="text-gray-400">NIK</div>
      <div className="text-gray-800">{data.nik || "3276********0042"}</div>
      <div className="text-gray-400">Alamat</div>
      <div className="text-gray-800">
        {data.alamat || "Kp. Cibenda RT 001/RW 001"}
      </div>
      <div className="text-gray-400">Jenis Surat</div>
      <div className="text-gray-800">
        {data.jenis} — {namaPanjangSurat[data.jenis] || "Surat Desa"}
      </div>
      <div className="text-gray-400">Keperluan</div>
      <div className="text-gray-800">
        {data.keperluan || "Keperluan administrasi pengajuan"}
      </div>
      <div className="text-gray-400">Diajukan</div>
      <div className="text-gray-800">{data.tanggal}</div>
      <div className="text-gray-400">Terakhir diproses</div>
      <div className="text-gray-800">{data.processed_at
    ? new Date(data.processed_at).toLocaleDateString("id-ID")
    : "-"}</div>
    </div>
  );
};

// Main Component
export function DetailSuratModal({ data, onClose }) {
  if (!data) return null;
  console.log("DETAIL DATA:", data);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Detail Permohonan Surat
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {data.noSurat !== "-"
                  ? data.noSurat
                  : `#024/${data.jenis}/V/2026`}{" "}
                - Surat saya
              </p>
            </div>
            <StatusBadge status={data.status} />
          </div>

          {/* Progress Tracker */}
          <ProgressTracker status={data.status} tanggal={data.tanggal} />

          {/* Detail Data */}
          <DetailInfo data={data} />

          {/* Preview Surat PDF — sama seperti Operator Desa */}
          <SuratPreview suratId={data.id} status={data.status} />

          {/* Back Button */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#4CAF4F] text-[#4CAF4F] rounded-md text-sm font-medium hover:bg-[#E8F5E9] transition"
            >
              <ChevronLeft className="w-4 h-4" />
              kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
