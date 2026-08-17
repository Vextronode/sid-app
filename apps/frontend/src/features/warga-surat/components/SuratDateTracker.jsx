/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
// ==========================================
// SuratDateTracker.jsx
// Pengganti tabel "Status Permohonan". Pilih tanggal lewat date picker,
// lalu tampilkan alur tracking (Submit -> RT -> RW -> Kantor Desa)
// untuk surat yang diajukan di tanggal itu. Kalau ada beberapa surat
// di tanggal yang sama, bisa geser (slide) pakai tombol panah.
// Ditambah: Preview PDF surat (read-only) di bawah stepper.
// ==========================================

import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, Check, Clock, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
// Hitung tahap tracking dari status surat: 0=Submit, 1=RT, 2=RW, 3=Selesai
function getStepState(status) {
  const map = {
    pending: { step: 1, state: "current" },

    rt_approved: { step: 2, state: "current_rw" },
    rt_rejected: { step: 1, state: "rejected_rt" },

    rw_approved: { step: 3, state: "current_office" },
    rw_rejected: { step: 2, state: "rejected_rw" },

    kasi_approved: { step: 4, state: "done" },
    kaur_tu_umum_approved: { step: 4, state: "done" },
    petugas_desa_approved: { step: 4, state: "done" },
  };

  return map[status] ?? { step: 0, state: "waiting" };
}

const STEPS = ['Submit', 'RT', 'RW', 'Kantor Desa'];

function TrackingStepper({ status }) {
  const { step, state } = getStepState(status);

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {STEPS.map((label, index) => {
        let circle;
        let color = 'text-gray-400';

        const isRejectedHere = (index === 1 && state === 'rejected_rt') || (index === 2 && state === 'rejected_rw');
        const isDone =
          (index === 0) ||
          (index === 1 && step >= 2) ||
          (index === 2 && step >= 3) ||
          (index === 3 && step >= 4);

        const isCurrent =
          (index === 1 && state === "current") ||
          (index === 2 && state === "current_rw") ||
          (index === 3 && state === "current_office");

        if (isRejectedHere) {
          circle = <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={16} /></div>;
          color = 'text-red-500';
        } else if (isDone) {
          circle = <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center"><Check size={16} /></div>;
          color = 'text-green-600';
        } else if (isCurrent) {
          circle = <div className="w-9 h-9 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center"><Clock size={16} /></div>;
          color = 'text-green-500';
        } else {
          circle = <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">{index + 1}</div>;
        }

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {circle}
              <span className={`text-[11px] font-medium ${color}`}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="w-8 sm:w-14 h-px bg-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}
const canPreviewStatuses = [
  "kasi_approved",
  "kaur_tu_umum_approved",
  "petugas_desa_approved",
];

const canPreviewSurat = (status) =>
  canPreviewStatuses.includes(status);
// ==========================================
// PREVIEW PDF
// PDF dirender menggunakan PDF.js
// sehingga HP tidak perlu membuka PDF viewer
// ==========================================
function SuratPreview({ suratId, status }) {
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pages, setPages] = useState([]);

  const canPreview = canPreviewSurat(status);

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
  // LOAD DAN RENDER PDF
  // ==========================================
  useEffect(() => {
    if (!suratId || !showPreview) return;

    let cancelled = false;
    let blobUrl = null;

    const loadPDF = async () => {
      try {
        setLoadingPreview(true);
        setLoadError(false);
        setPages([]);

        const template =
          status === "kasi_approved"
            ? "digital"
            : "wet";

        console.log("PREVIEW SURAT:", {
          suratId,
          status,
          template,
        });

        // Ambil blob URL dari backend
        blobUrl = await previewSuratPDF(
          { id: suratId },
          template
        );

        if (!blobUrl) {
          throw new Error("URL PDF tidak tersedia.");
        }

        if (cancelled) return;

        // ==========================================
        // FETCH BLOB
        // ==========================================
        const response = await fetch(blobUrl);

        if (!response.ok) {
          throw new Error(
            `Gagal mengambil PDF: ${response.status}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("File PDF kosong.");
        }

        if (cancelled) return;

        // ==========================================
        // PDF.JS
        // ==========================================
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;

        console.log(
          "PDF berhasil dibuka:",
          pdf.numPages,
          "halaman"
        );

        if (cancelled) return;

        const renderedPages = [];

        // ==========================================
        // RENDER SETIAP HALAMAN
        // ==========================================
        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);

          // Scale untuk tampilan HP
          const viewport = page.getViewport({
            scale: 1.5,
          });

          const canvas = document.createElement("canvas");

          const context = canvas.getContext("2d", {
            alpha: false,
          });

          if (!context) {
            throw new Error(
              "Browser tidak mendukung Canvas."
            );
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (cancelled) return;

          renderedPages.push({
            pageNumber,
            dataUrl: canvas.toDataURL(
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
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [suratId, showPreview, status]);

  return (
    <div className="space-y-3 mt-4">

      {/* ==========================================
          BUTTON PREVIEW
      ========================================== */}
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
          justify-center
          gap-2
          px-4
          py-2.5
          rounded-lg
          border
          text-sm
          font-medium
          transition
          w-full

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
          : "Preview tersedia setelah disetujui Kantor Desa"}
      </button>

      {/* ==========================================
          PREVIEW
      ========================================== */}
      {showPreview && (
        <div
          className="
            border
            rounded-lg
            overflow-hidden
            bg-gray-200
            p-2
          "
        >

          {/* ======================================
              LOADING
          ====================================== */}
          {loadingPreview && (
            <div
              className="
                h-[500px]
                flex
                flex-col
                items-center
                justify-center
                gap-3
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
                Memuat preview surat...
              </p>
            </div>
          )}

          {/* ======================================
              ERROR
          ====================================== */}
          {!loadingPreview && loadError && (
            <div
              className="
                h-[500px]
                flex
                flex-col
                items-center
                justify-center
                gap-2
                text-gray-400
                text-center
                px-5
              "
            >
              <FileText className="w-10 h-10" />

              <p className="text-sm">
                Gagal memuat preview surat
              </p>

              <p className="text-xs text-gray-400">
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

          {/* ======================================
              HASIL PDF
          ====================================== */}
          {!loadingPreview &&
            !loadError &&
            pages.length > 0 && (
              <div className="flex flex-col gap-3">

                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="
                      bg-white
                      rounded-sm
                      overflow-hidden
                      shadow-sm
                    "
                  >
                    <img
                      src={page.dataUrl}
                      alt={`Preview halaman ${page.pageNumber}`}
                      className="
                        block
                        w-full
                        h-auto
                        select-none
                      "
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


export default function SuratDateTracker({ letters, loading }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const dateInputRef = useRef(null);

  const filteredLetters = useMemo(() => {
    // Tidak memilih tanggal = tampilkan SEMUA surat
    if (!selectedDate) {
      return letters;
    }

    // Memilih tanggal = filter surat berdasarkan tanggal pengajuan
    return letters.filter((item) => {
      const raw = item.submitted_at ?? item.created_at;

      if (!raw) return false;

      return new Date(raw).toISOString().slice(0, 10) === selectedDate;
    });
  }, [letters, selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSlideIndex(0);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    setSlideIndex(0);
  };

  const openCalendar = () => {
    dateInputRef.current?.showPicker?.();
  };

  const activeSurat = filteredLetters[slideIndex];

  return (
    <div className="pt-4">

      {/* ==============================
          FILTER KALENDER
      ============================== */}
      <div className="flex items-center gap-2 mb-4">

        {/* Tombol kalender */}
        <button
          type="button"
          onClick={openCalendar}
          className="flex-1 flex items-center justify-between
            border rounded-full px-4 py-2.5
            text-sm text-gray-600 bg-white
            hover:border-green-400 transition"
        >
          <span>
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Semua tanggal'}
          </span>

          <Calendar size={16} className="text-gray-400" />
        </button>

        {/* Input date asli */}
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
        />

        {/* Tombol reset */}
        {selectedDate && (
          <button
            type="button"
            onClick={clearDateFilter}
            className="px-4 py-2.5
              border rounded-full
              text-xs font-medium
              text-gray-500
              bg-white
              hover:bg-gray-50
              whitespace-nowrap"
          >
            Semua
          </button>
        )}
      </div>

      {/* ==============================
          DATA SURAT
      ============================== */}
      {loading ? (
        <p className="text-center text-gray-400 text-sm py-6">
          Memuat data surat...
        </p>
      ) : filteredLetters.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">
          {selectedDate
            ? 'Belum ada surat pada tanggal ini.'
            : 'Belum ada permohonan surat.'}
        </p>
      ) : (
        <>
          {/* ==============================
              HEADER SURAT + SLIDER
          ============================== */}
          <div className="flex items-center justify-between mb-2">

            <button
              type="button"
              onClick={() =>
                setSlideIndex((i) => Math.max(0, i - 1))
              }
              disabled={slideIndex === 0}
              className="w-8 h-8 rounded-full border
                flex items-center justify-center
                text-gray-500
                disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <p className="font-semibold text-gray-800 text-sm">
                {activeSurat?.letter_type?.name ?? '-'}
              </p>

              <p className="text-[10px] text-gray-400">
                Surat {slideIndex + 1} dari {filteredLetters.length} · #
                {activeSurat?.letter_number ??
                  `SKD-${activeSurat?.id}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSlideIndex((i) =>
                  Math.min(
                    filteredLetters.length - 1,
                    i + 1
                  )
                )
              }
              disabled={
                slideIndex === filteredLetters.length - 1
              }
              className="w-8 h-8 rounded-full border
                flex items-center justify-center
                text-gray-500
                disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* ==============================
              TRACKING
          ============================== */}
          <TrackingStepper status={activeSurat?.status} />

          {/* ==============================
              DOT SLIDER
          ============================== */}
          {filteredLetters.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {filteredLetters.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setSlideIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === slideIndex
                      ? 'bg-green-600'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* ==============================
              PREVIEW PDF
          ============================== */}
          <SuratPreview
            suratId={activeSurat?.id}
            status={activeSurat?.status}
          />
        </>
      )}
    </div>
  );
}