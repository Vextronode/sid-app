// ==========================================
// SuratDetailModalKasi.jsx
// Popup detail surat Kasi.
// Approval final.
// ==========================================

import { useState } from "react";

import { useSuratDetailKasi } from "../hooks/useSuratDetailKasi";

import ApprovalStepperKasi from "./ApprovalStepperKasi";
import SuratInfoGridKasi from "./SuratInfoGridKasi";
import ApprovalActionBarKasi from "./ApprovalActionBarKasi";
import RejectReasonModalKasi from "./RejectReasonModalKasi";
import ApprovalHistoryKasi from "./ApprovalHistoryKasi";

export default function SuratDetailModalKasi({
  suratId,
  onClose,
  onApprove,
  onReject,
  readOnly = false,
}) {

  const {
    surat,
    isLoading,
    notFound,
  } = useSuratDetailKasi(suratId);

  const [
    rejectModalOpen,
    setRejectModalOpen,
  ] = useState(false);

  if (suratId === null) return null;

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>

        {isLoading ? (

          <p className="text-center py-10">
            Memuat surat...
          </p>

        ) : notFound || !surat ? (

          <p className="text-center text-gray-500 py-10">
            Surat tidak ditemukan.
          </p>

        ) : (

          <>

            <h2 className="font-medium text-gray-800">
              Detail Permohonan Surat

              {readOnly && (

                <span className="text-xs font-normal text-gray-400">
                  {" "}
                  (mode lihat)
                </span>

              )}

            </h2>

            <p className="text-xs text-gray-400 mb-6">

              #

              {surat.letter_number ?? surat.id}

              {" · Surat warga"}

            </p>

            <ApprovalStepperKasi
              surat={surat}
            />

            <SuratInfoGridKasi
              surat={surat}
            />

            <ApprovalHistoryKasi
              approvals={surat.approvals}
            />

            {readOnly ? (

              <button
                onClick={onClose}
                className="border border-green-500 text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50"
              >
                Tutup
              </button>

            ) : (

              <ApprovalActionBarKasi
                onApprove={onApprove}
                onReject={() => setRejectModalOpen(true)}
                onBack={onClose}
              />

            )}

          </>

        )}

      </div>

      {!readOnly && (

        <RejectReasonModalKasi
          open={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          onSubmit={(alasan) => {

            onReject(alasan);

            setRejectModalOpen(false);

          }}
        />

      )}

    </div>

  );

}