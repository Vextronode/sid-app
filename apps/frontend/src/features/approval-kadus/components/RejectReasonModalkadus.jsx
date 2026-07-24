import { useState } from "react";

export default function RejectReasonModalKadus({
  open,
  onClose,
  onSubmit,
}) {

  const [alasan, setAlasan] = useState("");

  if (!open) return null;

  const handleSubmit = () => {

    onSubmit(alasan);

    setAlasan("");

  };

  return (

    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">

        <h3 className="font-semibold text-gray-800 mb-1">
          Tolak Permohonan Surat
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          Alasan penolakan wajib diisi agar pemohon tahu apa yang perlu diperbaiki.
        </p>

        <textarea
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          rows={4}
          placeholder="Tulis alasan penolakan..."
          className="
            w-full
            border
            rounded-md
            p-3
            text-sm
            outline-none
            focus:border-red-400
            mb-4
          "
        />

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="
              px-4
              py-2
              rounded-md
              border
              text-gray-600
              text-sm
            "
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            disabled={alasan.trim() === ""}
            className="
              px-4
              py-2
              rounded-md
              bg-red-500
              text-white
              text-sm
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            Tolak Surat
          </button>

        </div>

      </div>

    </div>

  );

}