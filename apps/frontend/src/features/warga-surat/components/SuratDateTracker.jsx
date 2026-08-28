/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// SuratDateTracker.jsx
//
// Tracking surat berdasarkan tanggal pengajuan.
// Alur:
// Submit -> RT -> RW -> Kantor Desa
//
// Styling menggunakan class global sid-*.
// ==========================================

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  X,
} from "lucide-react";

import { previewSuratPDF } from "@/features/cetak-surat/utils/generateSuratPDF";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ==========================================
// STATUS TRACKING
// ==========================================

function getStepState(status) {
  const map = {
    pending: {
      step: 1,
      state: "current",
    },

    rt_approved: {
      step: 2,
      state: "current_rw",
    },

    rt_rejected: {
      step: 1,
      state: "rejected_rt",
    },

    rw_approved: {
      step: 3,
      state: "current_office",
    },

    rw_rejected: {
      step: 2,
      state: "rejected_rw",
    },

    kasi_approved: {
      step: 4,
      state: "done",
    },

    kaur_tu_umum_approved: {
      step: 4,
      state: "done",
    },

    petugas_desa_approved: {
      step: 4,
      state: "done",
    },
  };

  return (
    map[status] ?? {
      step: 0,
      state: "waiting",
    }
  );
}

// ==========================================
// TRACKING STEPS
// ==========================================

const STEPS = [
  "Submit",
  "RT",
  "RW",
  "Kantor Desa",
];

// ==========================================
// TRACKING STEPPER
// ==========================================

function TrackingStepper({ status }) {
  const { step, state } = getStepState(status);

  return (
    <div className="sid-tracker-scroll">
      <div className="sid-tracker-stepper">
        {STEPS.map((label, index) => {
          const isRejectedHere =
            (index === 1 && state === "rejected_rt") ||
            (index === 2 && state === "rejected_rw");

          const isDone =
            index === 0 ||
            (index === 1 && step >= 2) ||
            (index === 2 && step >= 3) ||
            (index === 3 && step >= 4);

          const isCurrent =
            (index === 1 && state === "current") ||
            (index === 2 && state === "current_rw") ||
            (index === 3 && state === "current_office");

          let circleClass =
            "sid-tracker-circle sid-tracker-circle-waiting";

          let labelClass = "sid-tracker-label";

          let circleContent = index + 1;

          if (isRejectedHere) {
            circleClass =
              "sid-tracker-circle sid-tracker-circle-rejected";

            labelClass =
              "sid-tracker-label sid-tracker-label-rejected";

            circleContent = (
              <X
                size={15}
                strokeWidth={2.5}
              />
            );
          } else if (isDone) {
            circleClass =
              "sid-tracker-circle sid-tracker-circle-done";

            labelClass =
              "sid-tracker-label sid-tracker-label-done";

            circleContent = (
              <Check
                size={15}
                strokeWidth={2.5}
              />
            );
          } else if (isCurrent) {
            circleClass =
              "sid-tracker-circle sid-tracker-circle-current";

            labelClass =
              "sid-tracker-label sid-tracker-label-current";

            circleContent = (
              <Clock size={15} />
            );
          }

          const connectorDone =
            index < step - 1;

          return (
            <div
              key={label}
              className="sid-tracker-step"
            >
<div className="sid-tracker-node">
  <div className={circleClass}>
    {circleContent}
  </div>

  {index < STEPS.length - 1 && (
    <div
      className={`sid-tracker-line${
        connectorDone
          ? " sid-tracker-line-done"
          : ""
      }`}
    />
  )}
</div>

<div className="sid-tracker-label-wrapper">
  <span className={labelClass}>
    {label}
  </span>
</div>


            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// STATUS PREVIEW PDF
// ==========================================

const canPreviewStatuses = [
  "kasi_approved",
  "kaur_tu_umum_approved",
  "petugas_desa_approved",
];

const canPreviewSurat = (status) =>
  canPreviewStatuses.includes(status);

// ==========================================
// TEMPLATE PDF
// ==========================================

function getPreviewTemplate(status) {
  if (status === "kasi_approved") {
    return "digital";
  }

  if (
    status === "kaur_tu_umum_approved" ||
    status === "petugas_desa_approved"
  ) {
    return "wet";
  }

  return null;
}

// ==========================================
// PREVIEW PDF
// ==========================================

function SuratPreview({
  suratId,
  status,
}) {
  const [
    showPreview,
    setShowPreview,
  ] = useState(false);

  const [
    loadingPreview,
    setLoadingPreview,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState(false);

  const [
    pages,
    setPages,
  ] = useState([]);

  const canPreview =
    canPreviewSurat(status);

  // ==========================================
  // RESET KETIKA SURAT BERUBAH
  // ==========================================

  useEffect(() => {
    setShowPreview(false);
    setLoadingPreview(false);
    setLoadError(false);
    setPages([]);
  }, [suratId]);

  // ==========================================
  // LOAD PDF
  // ==========================================

  useEffect(() => {
    if (
      !suratId ||
      !showPreview ||
      !canPreview
    ) {
      return;
    }

    let cancelled = false;
    let blobUrl = null;

    const loadPDF = async () => {
      try {
        setLoadingPreview(true);
        setLoadError(false);
        setPages([]);

        const template =
          getPreviewTemplate(status);

        if (!template) {
          throw new Error(
            "Template PDF tidak tersedia."
          );
        }

        console.log(
          "PREVIEW SURAT:",
          {
            suratId,
            status,
            template,
          }
        );

        blobUrl =
          await previewSuratPDF(
            {
              id: suratId,
            },
            template
          );

        if (!blobUrl) {
          throw new Error(
            "URL PDF tidak tersedia."
          );
        }

        if (cancelled) {
          return;
        }

        const response =
          await fetch(blobUrl);

        if (!response.ok) {
          throw new Error(
            `Gagal mengambil PDF: ${response.status}`
          );
        }

        const arrayBuffer =
          await response.arrayBuffer();

        if (
          !arrayBuffer ||
          arrayBuffer.byteLength === 0
        ) {
          throw new Error(
            "File PDF kosong."
          );
        }

        if (cancelled) {
          return;
        }

        const pdf =
          await pdfjsLib
            .getDocument({
              data: arrayBuffer,
            })
            .promise;

        console.log(
          "PDF berhasil dibuka:",
          pdf.numPages,
          "halaman"
        );

        if (cancelled) {
          return;
        }

        const renderedPages = [];

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (cancelled) {
            return;
          }

          const page =
            await pdf.getPage(
              pageNumber
            );

          const viewport =
            page.getViewport({
              scale: 1.5,
            });

          const canvas =
            document.createElement(
              "canvas"
            );

          const context =
            canvas.getContext(
              "2d",
              {
                alpha: false,
              }
            );

          if (!context) {
            throw new Error(
              "Browser tidak mendukung Canvas."
            );
          }

          canvas.width =
            Math.ceil(
              viewport.width
            );

          canvas.height =
            Math.ceil(
              viewport.height
            );

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (cancelled) {
            return;
          }

          renderedPages.push({
            pageNumber,
            dataUrl:
              canvas.toDataURL(
                "image/jpeg",
                0.9
              ),
          });
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch (error) {
        console.error(
          "GAGAL RENDER PREVIEW PDF:",
          error
        );

        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      }
    };

    loadPDF();

    return () => {
      cancelled = true;

      if (blobUrl) {
        URL.revokeObjectURL(
          blobUrl
        );
      }
    };
  }, [
    suratId,
    showPreview,
    status,
    canPreview,
  ]);

  return (
    <div className="sid-date-tracker-preview">
      <button
        type="button"
        disabled={!canPreview}
        onClick={() => {
          if (!canPreview) {
            return;
          }

          setShowPreview(
            (prev) => !prev
          );
        }}
        className={`sid-date-tracker-preview-action${
          !canPreview
            ? " sid-date-tracker-preview-action-disabled"
            : ""
        }`}
      >
        <FileText className="sid-date-tracker-preview-icon" />

        {canPreview
          ? showPreview
            ? "Sembunyikan Preview Surat"
            : "Lihat Preview Surat"
          : "Preview tersedia setelah disetujui Kantor Desa"}
      </button>

      {showPreview && (
        <div className="sid-date-preview-container">
          {loadingPreview && (
            <div className="sid-date-preview-loading">
              <div className="sid-date-preview-spinner" />

              <p>
                Memuat preview surat...
              </p>
            </div>
          )}

          {!loadingPreview &&
            loadError && (
              <div className="sid-date-preview-error">
                <FileText className="sid-date-preview-error-icon" />

                <p>
                  Gagal memuat preview surat
                </p>

                <p className="sid-date-preview-error-description">
                  Silakan coba lagi.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(false);

                    setTimeout(() => {
                      setShowPreview(true);
                    }, 100);
                  }}
                  className="sid-date-preview-retry"
                >
                  Coba Lagi
                </button>
              </div>
            )}

          {!loadingPreview &&
            !loadError &&
            pages.length > 0 && (
              <div className="sid-date-preview-pages">
                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="sid-date-preview-page"
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Preview halaman ${page.pageNumber}`}
                      className="sid-date-preview-image"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// HELPER FILTER TANGGAL
// ==========================================

function getLocalDateString(rawDate) {
  if (!rawDate) {
    return null;
  }

  const date =
    new Date(rawDate);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SuratDateTracker({
  letters,
  loading,
}) {
  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    slideIndex,
    setSlideIndex,
  ] = useState(0);

  const dateInputRef =
    useRef(null);

  // ==========================================
  // FILTER SURAT
  // ==========================================

  const filteredLetters =
    useMemo(() => {
      if (!Array.isArray(letters)) {
        return [];
      }

      if (!selectedDate) {
        return letters;
      }

      return letters.filter(
        (item) => {
          const raw =
            item.submitted_at ??
            item.created_at;

          const localDate =
            getLocalDateString(raw);

          return (
            localDate ===
            selectedDate
          );
        }
      );
    }, [
      letters,
      selectedDate,
    ]);

  // ==========================================
  // JAGA SLIDE INDEX
  // ==========================================

  useEffect(() => {
    if (
      filteredLetters.length === 0
    ) {
      setSlideIndex(0);
      return;
    }

    if (
      slideIndex >=
      filteredLetters.length
    ) {
      setSlideIndex(
        filteredLetters.length - 1
      );
    }
  }, [
    filteredLetters.length,
    slideIndex,
  ]);

  // ==========================================
  // FILTER TANGGAL
  // ==========================================

  const handleDateChange = (e) => {
    setSelectedDate(
      e.target.value
    );

    setSlideIndex(0);
  };

  const clearDateFilter = () => {
    setSelectedDate("");
    setSlideIndex(0);
  };

  const openCalendar = () => {
    dateInputRef.current
      ?.showPicker?.();
  };

  // ==========================================
  // SURAT AKTIF
  // ==========================================

  const activeSurat =
    filteredLetters[
      slideIndex
    ];

  // ==========================================
  // FORMAT TANGGAL
  // ==========================================

  const formattedSelectedDate =
    selectedDate
      ? new Date(
          `${selectedDate}T00:00:00`
        ).toLocaleDateString(
          "id-ID",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        )
      : null;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="sid-date-tracker">
      {/* FILTER TANGGAL */}

      <div className="sid-date-tracker-filter">
        <button
          type="button"
          onClick={openCalendar}
          className="sid-date-tracker-calendar-button"
        >
          <div className="sid-date-tracker-calendar-label">
            <Calendar
              size={16}
              strokeWidth={1.8}
              className="sid-date-tracker-calendar-icon"
            />

            <span>
              {formattedSelectedDate ??
                "Pilih tanggal"}
            </span>
          </div>

          <span className="sid-date-tracker-calendar-action">
            {selectedDate
              ? "Ubah"
              : "Pilih"}
          </span>
        </button>

        {selectedDate && (
          <button
            type="button"
            onClick={clearDateFilter}
            className="sid-date-tracker-clear-button"
          >
            Semua
          </button>
        )}

        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="sid-date-tracker-date-input"
        />
      </div>

      {/* DATA SURAT */}

      {loading ? (
        <p className="sid-date-tracker-empty">
          Memuat data surat...
        </p>
      ) : filteredLetters.length === 0 ? (
        <p className="sid-date-tracker-empty">
          {selectedDate
            ? "Belum ada surat pada tanggal ini."
            : "Belum ada permohonan surat."}
        </p>
      ) : (
        <>
          {/* HEADER SURAT + NAVIGASI */}

          <div className="sid-date-tracker-header">
            <button
              type="button"
              onClick={() =>
                setSlideIndex(
                  (i) =>
                    Math.max(
                      0,
                      i - 1
                    )
                )
              }
              disabled={
                slideIndex === 0
              }
              aria-label="Surat sebelumnya"
              className="sid-date-tracker-nav-button"
            >
              <ChevronLeft
                size={17}
                strokeWidth={1.8}
              />
            </button>

            <div className="sid-date-tracker-header-info">
              <p className="sid-date-tracker-letter-type">
                {activeSurat
                  ?.letter_type?.name ??
                  "-"}
              </p>

              <p className="sid-date-tracker-letter-number">
                Surat{" "}
                {slideIndex + 1}{" "}
                dari{" "}
                {filteredLetters.length}

                {" · "}

                #
                {activeSurat
                  ?.letter_number ??
                  `SKD-${activeSurat?.id}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSlideIndex(
                  (i) =>
                    Math.min(
                      filteredLetters.length - 1,
                      i + 1
                    )
                )
              }
              disabled={
                slideIndex ===
                filteredLetters.length - 1
              }
              aria-label="Surat berikutnya"
              className="sid-date-tracker-nav-button"
            >
              <ChevronRight
                size={17}
                strokeWidth={1.8}
              />
            </button>
          </div>

          {/* TRACKING */}

          <TrackingStepper
            status={
              activeSurat?.status
            }
          />

          {/* DOT SLIDER */}

          {filteredLetters.length > 1 && (
            <div className="sid-date-tracker-dots">
              {filteredLetters.map(
                (_, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() =>
                      setSlideIndex(index)
                    }
                    aria-label={`Pilih surat ${index + 1}`}
                    className={`sid-date-tracker-dot${
                      index === slideIndex
                        ? " active"
                        : ""
                    }`}
                  />
                )
              )}
            </div>
          )}

          {/* PREVIEW PDF */}

          <SuratPreview
            suratId={
              activeSurat?.id
            }
            status={
              activeSurat?.status
            }
          />
        </>
      )}
    </div>
  );
}