
import { useEffect, useState, useRef } from "react";
import {
  Check,
  Clock,
  ChevronLeft,
  X,
  FileText,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { previewSuratPDF } from "@/features/cetak-surat/utils/generateSuratPDF";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


// ======================================================
// PROGRESS TRACKER
// ======================================================

const ProgressTracker = ({ status, tanggal }) => {
  const currentStatus = (status || "").toLowerCase();

  // ======================================================
  // RT
  // ======================================================

  const isRtRejected =
    currentStatus === "rt_rejected";

  const isRtDone = [
    "rt_approved",
    "rw_approved",
    "rw_rejected",
    "kasi_approved",
    "kasi_rejected",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);


  // ======================================================
  // RW
  // ======================================================

  const isRwRejected =
    currentStatus === "rw_rejected";

  const isRwDone = [
    "rw_approved",
    "rw_rejected",
    "kasi_approved",
    "kasi_rejected",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);


  // ======================================================
  // SELESAI / KANTOR DESA
  // ======================================================

  const isSelesaiRejected =
    currentStatus === "kasi_rejected";

  const isSelesaiDone = [
    "kasi_approved",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);


  return (
    <div className="relative flex justify-between items-start w-full max-w-sm py-4">

      {/* Garis */}
      <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />


      {/* ==================================================
          SUBMIT
      ================================================== */}

      <div className="relative z-10 flex flex-col items-center gap-2 px-2">

        <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-sm">
          <Check
            className="w-5 h-5"
            strokeWidth={3}
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Submit
          </p>

          <p className="text-[10px] text-gray-400">
            {tanggal}
          </p>
        </div>

      </div>


      {/* ==================================================
          RT
      ================================================== */}

      <div className="relative z-10 flex flex-col items-center gap-2 px-2">

        <div
          className={`
            w-8 h-8
            rounded-full
            flex
            items-center
            justify-center
            shadow-sm

            ${
              isRtRejected
                ? "bg-red-500 text-white"
                : isRtDone
                ? "bg-[#16A34A] text-white"
                : "bg-white border-2 border-gray-800 text-gray-800"
            }
          `}
        >

          {isRtRejected ? (
            <X
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : isRtDone ? (
            <Check
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : (
            <Clock className="w-4 h-4" />
          )}

        </div>


        <div className="text-center">

          <p className="text-xs text-gray-500">
            RT
          </p>

          <p
            className={`
              text-[10px]

              ${
                isRtRejected
                  ? "text-red-500 font-medium"
                  : "text-gray-400"
              }
            `}
          >
            {isRtRejected
              ? "Ditolak"
              : isRtDone
              ? "Selesai"
              : "Menunggu"}
          </p>

        </div>

      </div>


      {/* ==================================================
          RW
      ================================================== */}

      <div className="relative z-10 flex flex-col items-center gap-2 px-2">

        <div
          className={`
            w-8 h-8
            rounded-full
            flex
            items-center
            justify-center
            shadow-sm

            ${
              isRwRejected
                ? "bg-red-500 text-white"
                : isRwDone
                ? "bg-[#16A34A] text-white"
                : isRtDone && !isRtRejected
                ? "bg-white border-2 border-gray-800 text-gray-800"
                : "bg-white border-2 border-gray-200 text-gray-300"
            }
          `}
        >

          {isRwRejected ? (
            <X
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : isRwDone ? (
            <Check
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : isRtDone && !isRtRejected ? (
            <Clock className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">
              3
            </span>
          )}

        </div>


        <div className="text-center">

          <p className="text-xs text-gray-500">
            RW
          </p>

          <p
            className={`
              text-[10px]

              ${
                isRwRejected
                  ? "text-red-500 font-medium"
                  : "text-gray-400"
              }
            `}
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


      {/* ==================================================
          SELESAI
      ================================================== */}

      <div className="relative z-10 flex flex-col items-center gap-2 px-2">

        <div
          className={`
            w-8 h-8
            rounded-full
            flex
            items-center
            justify-center
            shadow-sm

            ${
              isSelesaiRejected
                ? "bg-red-500 text-white"
                : isSelesaiDone
                ? "bg-[#16A34A] text-white"
                : isRwDone && !isRwRejected
                ? "bg-white border-2 border-gray-800 text-gray-800"
                : "bg-white border-2 border-gray-200 text-gray-300"
            }
          `}
        >

          {isSelesaiRejected ? (
            <X
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : isSelesaiDone ? (
            <Check
              className="w-5 h-5"
              strokeWidth={3}
            />
          ) : isRwDone && !isRwRejected ? (
            <Clock className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">
              4
            </span>
          )}

        </div>


        <div className="text-center">

          <p className="text-xs text-gray-500">
            Selesai
          </p>

          <p
            className={`
              text-[10px]

              ${
                isSelesaiRejected
                  ? "text-red-500 font-medium"
                  : "text-gray-400"
              }
            `}
          >
            {isSelesaiRejected
              ? "Ditolak"
              : isSelesaiDone
              ? "Selesai"
              : "-"}
          </p>

        </div>

      </div>

    </div>
  );
};


// ======================================================
// PREVIEW PDF
// Desktop + HP
// Menggunakan PDF.js canvas
// ======================================================

const SuratPreview = ({ suratId, status }) => {

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [showPreview, setShowPreview] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState(false);

  const canvasContainerRef =
    useRef(null);

  const pdfDocumentRef =
    useRef(null);


  const canPreview =
    status === "kasi_approved" ||
    status === "kaur_tu_umum_approved" ||
    status === "petugas_desa_approved";


  // ======================================================
  // RESET KETIKA SURAT BERUBAH
  // ======================================================

  useEffect(() => {

    setShowPreview(false);
    setPreviewUrl(null);
    setLoadError(false);

    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }

  }, [suratId]);


  // ======================================================
  // AMBIL PDF
  // ======================================================

  useEffect(() => {

    if (!suratId || !showPreview || !canPreview) {
      return;
    }

    let cancelled = false;
    let url = null;


    const loadPDF = async () => {

      try {

        setLoading(true);
        setLoadError(false);
        setPreviewUrl(null);


        const template =
          status === "kasi_approved"
            ? "digital"
            : "wet";


        const blobUrl =
          await previewSuratPDF(
            { id: suratId },
            template
          );


        if (cancelled) {

          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }

          return;
        }


        url = blobUrl;

        setPreviewUrl(blobUrl);

      } catch (error) {

        console.error(
          "Gagal mengambil PDF:",
          error
        );

        if (!cancelled) {
          setLoadError(true);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };


    loadPDF();


    return () => {

      cancelled = true;

      if (url) {
        URL.revokeObjectURL(url);
      }

    };

  }, [
    suratId,
    showPreview,
    status,
    canPreview,
  ]);


  // ======================================================
  // RENDER PDF KE CANVAS
  // ======================================================

  useEffect(() => {

    if (
      !previewUrl ||
      !showPreview ||
      !canvasContainerRef.current
    ) {
      return;
    }


    let cancelled = false;


    const renderPDF = async () => {

      try {

        setLoading(true);
        setLoadError(false);


        const loadingTask =
          pdfjsLib.getDocument({
            url: previewUrl,
          });


        const pdf =
          await loadingTask.promise;


        if (cancelled) {

          await pdf.destroy();

          return;
        }


        pdfDocumentRef.current = pdf;


        const container =
          canvasContainerRef.current;


        container.innerHTML = "";


        // Render semua halaman PDF
        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {

          if (cancelled) break;


          const page =
            await pdf.getPage(pageNumber);


          const baseViewport =
            page.getViewport({
              scale: 1,
            });


          // Lebar mengikuti container
          const containerWidth =
            container.clientWidth || 600;


          const horizontalPadding = 16;


          const scale =
            (containerWidth - horizontalPadding) /
            baseViewport.width;


                    const viewport = page.getViewport({
            scale: Math.max(scale, 0.5),
          });

          // Wrapper setiap halaman
          const pageWrapper = document.createElement("div");

          pageWrapper.className =
            "w-full flex justify-center mb-4 last:mb-0";

          // Canvas
          const canvas =
            document.createElement("canvas");

          const context =
            canvas.getContext("2d");

          const pixelRatio =
            window.devicePixelRatio || 1;

          canvas.width =
            Math.floor(viewport.width * pixelRatio);

          canvas.height =
            Math.floor(viewport.height * pixelRatio);

          canvas.style.width =
            `${viewport.width}px`;

          canvas.style.height =
            `${viewport.height}px`;

          canvas.className =
            "block max-w-full h-auto shadow-sm bg-white";


          context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
          );


          pageWrapper.appendChild(canvas);

          container.appendChild(pageWrapper);


          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }

      } catch (error) {

        console.error(
          "Gagal render PDF:",
          error
        );

        if (!cancelled) {
          setLoadError(true);
        }

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };


    renderPDF();


    return () => {
      cancelled = true;
    };

  }, [previewUrl, showPreview]);


  // ======================================================
  // TAMPILAN
  // ======================================================

  return (
    <div className="space-y-3">

      {/* ==================================================
          BUTTON
      ================================================== */}

      <button
        type="button"
        disabled={!canPreview}
        onClick={() => {

          if (!canPreview) return;

          setShowPreview((prev) => !prev);

        }}
        className={`
          inline-flex
          items-center
          gap-2
          px-4
          py-2.5
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


      {/* ==================================================
          PREVIEW
      ================================================== */}

      {showPreview && (

        <div
          className="
            relative
            border
            rounded-lg
            overflow-hidden
            bg-gray-100
            w-full
          "
        >

          {/* LOADING */}

          {loading && (

            <div
              className="
                absolute
                inset-0
                z-20
                flex
                flex-col
                items-center
                justify-center
                gap-3
                bg-gray-100
              "
            >

              <div
                className="
                  w-8
                  h-8
                  border-2
                  border-gray-300
                  border-t-green-600
                  rounded-full
                  animate-spin
                "
              />

              <p className="text-sm text-gray-500">
                Memuat preview...
              </p>

            </div>

          )}


          {/* ERROR */}

          {!loading && loadError && (

            <div
              className="
                min-h-[300px]
                flex
                flex-col
                items-center
                justify-center
                gap-2
                text-gray-400
                px-6
                text-center
              "
            >

              <FileText className="w-8 h-8" />

              <p className="text-sm">
                Gagal memuat preview surat
              </p>


              <button
                type="button"
                onClick={() => {

                  setLoadError(false);
                  setPreviewUrl(null);

                  setShowPreview(false);

                  setTimeout(() => {
                    setShowPreview(true);
                  }, 100);

                }}
                className="
                  mt-2
                  px-4
                  py-2
                  rounded-lg
                  bg-green-600
                  text-white
                  text-xs
                  font-medium
                  hover:bg-green-700
                "
              >
                Coba Lagi
              </button>

            </div>

          )}


          {/* ==================================================
              CANVAS CONTAINER
          ================================================== */}

          {!loadError && (

            <div
              ref={canvasContainerRef}
              className="
                w-full
                overflow-y-auto
                overflow-x-hidden
                bg-gray-200
                p-2
                sm:p-4
                max-h-[70vh]
                sm:max-h-[700px]
              "
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            />

          )}

        </div>

      )}

    </div>
  );
};


// ======================================================
// DETAIL INFORMASI
// ======================================================

const DetailInfo = ({ data }) => {

  const namaPanjangSurat = {
    SKD: "Surat Keterangan Domisili",
    SKTM: "Surat Keterangan Tidak Mampu",
    SKU: "Surat Keterangan Usaha",
  };


  return (

    <div
      className="
        grid
        grid-cols-[130px_1fr]
        sm:grid-cols-[160px_1fr]
        gap-y-3
        text-sm
      "
    >

      <div className="text-gray-400">
        Nama Pemohon
      </div>

      <div className="text-gray-800 font-medium">
        {data.pemohon || "-"}
      </div>


      <div className="text-gray-400">
        NIK
      </div>

      <div className="text-gray-800">
        {data.nik || "3276********0042"}
      </div>


      <div className="text-gray-400">
        Alamat
      </div>

      <div className="text-gray-800">
        {data.alamat || "Kp. Cibenda RT 001/RW 001"}
      </div>


      <div className="text-gray-400">
        Jenis Surat
      </div>

      <div className="text-gray-800">
        {data.jenis} —{" "}
        {namaPanjangSurat[data.jenis] ||
          "Surat Desa"}
      </div>


      <div className="text-gray-400">
        Keperluan
      </div>

      <div className="text-gray-800">
        {data.keperluan ||
          "Keperluan administrasi pengajuan"}
      </div>


      <div className="text-gray-400">
        Diajukan
      </div>

      <div className="text-gray-800">
        {data.tanggal}
      </div>


      <div className="text-gray-400">
        Terakhir diproses
      </div>

      <div className="text-gray-800">
        {data.processed_at
          ? new Date(
              data.processed_at
            ).toLocaleDateString("id-ID")
          : "-"}
      </div>

      {/* Alasan penolakan */}
{["rt_rejected", "rw_rejected", "kasi_rejected"].includes(
  (data.status || "").toLowerCase()
) && (
  <>
    <div className="text-gray-400">
      Alasan Penolakan
    </div>

    <div className="text-black">
      {data.notes || "-"}
    </div>
  </>
)}

    </div>

  );
};


// ======================================================
// MAIN COMPONENT
// ======================================================

export function DetailSuratModal({
  data,
  onClose,
}) {

  if (!data) return null;


  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        p-4
        bg-black/40
        backdrop-blur-sm
      "
    >

      <div
        className="
          bg-white
          rounded-xl
          shadow-xl
          w-full
          max-w-2xl
          max-h-[90vh]
          overflow-y-auto
          animate-in
          fade-in
          zoom-in-95
          duration-200
        "
      >

        <div
          className="
            p-6
            md:p-8
            space-y-8
          "
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div>

              <h2
                className="
                  text-xl
                  font-semibold
                  text-gray-800
                "
              >
                Detail Permohonan Surat
              </h2>

              <p
                className="
                  text-sm
                  text-gray-400
                  mt-1
                "
              >
                {data.noSurat !== "-"
                  ? data.noSurat
                  : `#024/${data.jenis}/V/2026`}{" "}
                - Surat saya
              </p>

            </div>


            

          </div>


          {/* ==================================================
              PROGRESS
          ================================================== */}

          <ProgressTracker
            status={data.status}
            tanggal={data.tanggal}
          />


          {/* ==================================================
              DETAIL
          ================================================== */}

          <DetailInfo
            data={data}
          />


          {/* ==================================================
              PREVIEW PDF
          ================================================== */}

          <SuratPreview
            suratId={data.id}
            status={data.status}
          />


          {/* ==================================================
              BACK
          ================================================== */}

          <div className="pt-4">

            <button
              onClick={onClose}
              className="
                inline-flex
                items-center
                gap-1.5
                px-4
                py-2
                border
                border-[#4CAF4F]
                text-[#4CAF4F]
                rounded-md
                text-sm
                font-medium
                hover:bg-[#E8F5E9]
                transition
              "
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