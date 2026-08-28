import { useEffect, useState, useRef } from "react";
import {
  Check,
  Clock,
  ChevronLeft,
  X,
  FileText,
} from "lucide-react";

import { previewSuratPDF } from "@/features/cetak-surat/utils/generateSuratPDF";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


// ======================================================
// PROGRESS TRACKER
// ======================================================

const ProgressTracker = ({ status, tanggal }) => {
  const currentStatus = (status || "").toLowerCase();

  const isRtRejected = currentStatus === "rt_rejected";

  const isRtDone = [
    "rt_approved",
    "rw_approved",
    "rw_rejected",
    "kasi_approved",
    "kasi_rejected",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);

  const isRwRejected = currentStatus === "rw_rejected";

  const isRwDone = [
    "rw_approved",
    "rw_rejected",
    "kasi_approved",
    "kasi_rejected",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);

  const isSelesaiRejected = currentStatus === "kasi_rejected";

  const isSelesaiDone = [
    "kasi_approved",
    "kaur_tu_umum_approved",
    "petugas_desa_approved",
  ].includes(currentStatus);

  return (
    <div className="sid-progress-tracker">

      {/* GARIS */}
      <div className="sid-progress-line" />


      {/* ==================================================
          SUBMIT
      ================================================== */}

      <div className="sid-progress-item">
        <div className="sid-progress-circle sid-progress-done">
          <Check
            className="w-4 h-4 sm:w-5 sm:h-5"
            strokeWidth={3}
          />
        </div>

        <div className="sid-progress-text">
          <p>Submit</p>

          <span>
            {tanggal}
          </span>
        </div>
      </div>


      {/* ==================================================
          RT
      ================================================== */}

      <div className="sid-progress-item">

        <div
          className={`
            sid-progress-circle
            ${
              isRtRejected
                ? "sid-progress-rejected"
                : isRtDone
                ? "sid-progress-done"
                : "sid-progress-waiting"
            }
          `}
        >
          {isRtRejected ? (
            <X
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : isRtDone ? (
            <Check
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : (
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </div>

        <div className="sid-progress-text">
          <p>RT</p>

          <span
            className={
              isRtRejected
                ? "sid-progress-status-rejected"
                : ""
            }
          >
            {isRtRejected
              ? "Ditolak"
              : isRtDone
              ? "Selesai"
              : "Menunggu"}
          </span>
        </div>

      </div>


      {/* ==================================================
          RW
      ================================================== */}

      <div className="sid-progress-item">

        <div
          className={`
            sid-progress-circle
            ${
              isRwRejected
                ? "sid-progress-rejected"
                : isRwDone
                ? "sid-progress-done"
                : isRtDone && !isRtRejected
                ? "sid-progress-waiting-active"
                : "sid-progress-disabled"
            }
          `}
        >
          {isRwRejected ? (
            <X
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : isRwDone ? (
            <Check
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : isRtDone && !isRtRejected ? (
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <span>3</span>
          )}
        </div>

        <div className="sid-progress-text">
          <p>RW</p>

          <span
            className={
              isRwRejected
                ? "sid-progress-status-rejected"
                : ""
            }
          >
            {isRwRejected
              ? "Ditolak"
              : !isRtDone || isRtRejected
              ? "-"
              : isRwDone
              ? "Selesai"
              : "Menunggu"}
          </span>
        </div>

      </div>


      {/* ==================================================
          SELESAI
      ================================================== */}

      <div className="sid-progress-item">

        <div
          className={`
            sid-progress-circle
            ${
              isSelesaiRejected
                ? "sid-progress-rejected"
                : isSelesaiDone
                ? "sid-progress-done"
                : isRwDone && !isRwRejected
                ? "sid-progress-waiting-active"
                : "sid-progress-disabled"
            }
          `}
        >
          {isSelesaiRejected ? (
            <X
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : isSelesaiDone ? (
            <Check
              className="w-4 h-4 sm:w-5 sm:h-5"
              strokeWidth={3}
            />
          ) : isRwDone && !isRwRejected ? (
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <span>4</span>
          )}
        </div>

        <div className="sid-progress-text">
          <p>Selesai</p>

          <span
            className={
              isSelesaiRejected
                ? "sid-progress-status-rejected"
                : ""
            }
          >
            {isSelesaiRejected
              ? "Ditolak"
              : isSelesaiDone
              ? "Selesai"
              : "-"}
          </span>
        </div>

      </div>

    </div>
  );
};


// ======================================================
// PREVIEW PDF
// ======================================================

const SuratPreview = ({ suratId, status }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const canvasContainerRef = useRef(null);
  const pdfDocumentRef = useRef(null);

  const canPreview =
    status === "kasi_approved" ||
    status === "kaur_tu_umum_approved" ||
    status === "petugas_desa_approved";


  useEffect(() => {
    setShowPreview(false);
    setPreviewUrl(null);
    setLoadError(false);

    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }
  }, [suratId]);


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

        const blobUrl = await previewSuratPDF(
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

          const containerWidth =
            container.clientWidth || 600;

          const computedStyle =
            window.getComputedStyle(container);

          const paddingLeft =
            parseFloat(
              computedStyle.paddingLeft
            ) || 0;

          const paddingRight =
            parseFloat(
              computedStyle.paddingRight
            ) || 0;

          const availableWidth =
            containerWidth -
            paddingLeft -
            paddingRight;

          const scale =
            availableWidth /
            baseViewport.width;

          const viewport =
            page.getViewport({
              scale: Math.max(scale, 0.5),
            });

          const pageWrapper =
            document.createElement("div");

          pageWrapper.className =
            "sid-pdf-page";

          const canvas =
            document.createElement("canvas");

          const context =
            canvas.getContext("2d");

          const pixelRatio =
            window.devicePixelRatio || 1;

          canvas.width =
            Math.floor(
              viewport.width *
              pixelRatio
            );

          canvas.height =
            Math.floor(
              viewport.height *
              pixelRatio
            );

          canvas.style.width =
            `${viewport.width}px`;

          canvas.style.height =
            `${viewport.height}px`;

          canvas.className =
            "sid-pdf-canvas";

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


  return (
    <div className="sid-preview">

      <button
        type="button"
        disabled={!canPreview}
        onClick={() => {
          if (!canPreview) return;

          setShowPreview((prev) => !prev);
        }}
        className={`
          sid-btn
          sid-btn-preview
          sid-btn-full
          ${!canPreview ? "sid-preview-disabled" : ""}
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
        <div className="sid-preview-container">

          {loading && (
            <div className="sid-preview-loading">

              <div className="sid-loading-spinner" />

              <p>
                Memuat preview...
              </p>

            </div>
          )}


          {!loading && loadError && (
            <div className="sid-preview-error">

              <FileText className="w-8 h-8" />

              <p>
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
                className="sid-btn sid-btn-primary"
              >
                Coba Lagi
              </button>

            </div>
          )}


          {!loadError && (
            <div
              ref={canvasContainerRef}
              className="sid-pdf-container"
            />
          )}

        </div>
      )}

    </div>
  );
};


// ======================================================
// DETAIL INFORMATION
// ======================================================

const DetailInfo = ({ data }) => {
  const namaPanjangSurat = {
    SKD: "Surat Keterangan Domisili",
    SKTM: "Surat Keterangan Tidak Mampu",
    SKU: "Surat Keterangan Usaha",
  };

  return (
    <div className="sid-detail-grid">

      <div className="sid-detail-label">
        Nama Pemohon
      </div>

      <div className="sid-detail-value">
        {data.pemohon || "-"}
      </div>


      <div className="sid-detail-label">
        NIK
      </div>

      <div className="sid-detail-value sid-break">
        {data.nik || "3276********0042"}
      </div>


      <div className="sid-detail-label">
        Alamat
      </div>

      <div className="sid-detail-value sid-break">
        {data.alamat ||
          "Kp. Cibenda RT 001/RW 001"}
      </div>


      <div className="sid-detail-label">
        Jenis Surat
      </div>

      <div className="sid-detail-value sid-break">
        {data.jenis} —{" "}
        {namaPanjangSurat[data.jenis] ||
          "Surat Desa"}
      </div>


      <div className="sid-detail-label">
        Keperluan
      </div>

      <div className="sid-detail-value sid-break">
        {data.purpose ||
          "Keperluan administrasi pengajuan"}
      </div>


      <div className="sid-detail-label">
        Diajukan
      </div>

      <div className="sid-detail-value">
        {data.tanggal}
      </div>


      <div className="sid-detail-label">
        Terakhir diproses
      </div>

      <div className="sid-detail-value">
        {data.processed_at
          ? new Date(
              data.processed_at
            ).toLocaleDateString("id-ID")
          : "-"}
      </div>


      {[
        "rt_rejected",
        "rw_rejected",
        "kasi_rejected",
      ].includes(
        (data.status || "").toLowerCase()
      ) && (
        <>
          <div className="sid-detail-label">
            Alasan Penolakan
          </div>

          <div className="sid-detail-value sid-break sid-rejection-text">
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
    <div className="sid-modal-overlay sid-detail-modal-overlay">

      <div className="sid-modal sid-detail-modal">

        <div className="sid-detail-modal-content">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="sid-modal-header">

            <div className="sid-detail-header-text">

              <h2 className="sid-modal-title">
                Detail Permohonan Surat
              </h2>

              <p className="sid-modal-subtitle">
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

          <div className="sid-modal-stepper sid-detail-stepper">

            <div className="sid-progress-scroll">

              <ProgressTracker
                status={data.status}
                tanggal={data.tanggal}
              />

            </div>

          </div>


          {/* ==================================================
              DETAIL
          ================================================== */}

          <div className="sid-detail-box">

            <DetailInfo data={data} />

          </div>


          {/* ==================================================
              PREVIEW
          ================================================== */}

          <div className="sid-detail-preview">

            <SuratPreview
              suratId={data.id}
              status={data.status}
            />

          </div>


          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="sid-detail-footer">

            <button
              type="button"
              onClick={onClose}
              className="sid-btn sid-btn-secondary sid-detail-back-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}