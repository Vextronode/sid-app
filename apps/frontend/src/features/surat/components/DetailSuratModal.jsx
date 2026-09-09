// ==========================================
// DetailSuratModal.jsx
// Popup detail surat untuk Warga.
//
// Styling dan struktur mengikuti
// SuratDetailModalRT.
//
// Workflow:
// Submit -> RT -> Selesai / TTD
//
// Warga hanya dapat melihat detail,
// keputusan RT, progress, dan preview.
// ==========================================

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Eye,
  FileText,
  X,
} from 'lucide-react';

import ApprovalStepperRT from '@/features/approval-rt/components/ApprovalStepperRT';
import { previewSuratPDF } from '@/features/cetak-surat/utils/generateSuratPDF';

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


// ==========================================
// FIELD MAP
// ==========================================

const FIELD_MAP = {
  noSurat: (s) =>
    s?.letter_number ?? '-',

  namaPemohon: (s) =>
    s?.applicant_name ?? '-',

  nik: (s) =>
    s?.applicant_nik ?? '-',

  alamat: (s) =>
    s?.applicant_address ?? '-',

  jenisSurat: (s) =>
    s?.letter_type?.name ?? '-',

  keperluan: (s) =>
    s?.purpose ?? '-',

  diajukan: (s) =>
    s?.submitted_at
      ? new Date(
          s.submitted_at
        ).toLocaleString('id-ID')
      : '-',

  terakhirDiproses: (s) =>
    s?.updated_at
      ? new Date(
          s.updated_at
        ).toLocaleString('id-ID')
      : '-',

  riwayat: (s) =>
    s?.decisions ?? [],
};


// ==========================================
// PREVIEW PDF
// ==========================================

function SuratPreview({
  surat,
}) {
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


  // ========================================
  // STATUS PREVIEW
  // ========================================

  const status =
    surat?.status;

  const canPreview = [
    'kasi_approved',
    'kaur_tu_umum_approved',
    'petugas_desa_approved',
    'completed',
  ].includes(status);



  // ========================================
  // RESET
  // ========================================

  useEffect(() => {
    if (pdfDocumentRef.current) {
      pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }

    // Reset state dilakukan melalui callback async
    // agar tidak memicu cascading render secara
    // synchronous di dalam effect.
    const resetTimer = setTimeout(() => {
      setShowPreview(false);
      setLoading(false);
      setLoadError(false);
    }, 0);

    return () => {
      clearTimeout(resetTimer);
    };
  }, [surat?.id]);




  // ========================================
  // LOAD PDF
  // ========================================

  useEffect(() => {
    if (
      !showPreview ||
      !canPreview ||
      !surat?.id
    ) {
      return;
    }

    let cancelled = false;
    let blobUrl = null;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        const template =
          status === 'kasi_approved'
            ? 'digital'
            : 'wet';

        blobUrl =
          await previewSuratPDF(
            surat,
            template
          );

        if (cancelled) {
          if (blobUrl) {
            URL.revokeObjectURL(
              blobUrl
            );
          }

          return;
        }

        const loadingTask =
          pdfjsLib.getDocument({
            url: blobUrl,
          });

        const pdf =
          await loadingTask.promise;

        if (cancelled) {
          await pdf.destroy();

          URL.revokeObjectURL(
            blobUrl
          );

          return;
        }

        pdfDocumentRef.current = pdf;

        const container =
          canvasContainerRef.current;

        if (!container) {
          return;
        }

        container.innerHTML = '';

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (cancelled) {
            break;
          }

          const page =
            await pdf.getPage(
              pageNumber
            );

          const baseViewport =
            page.getViewport({
              scale: 1,
            });

          const containerWidth =
            container.clientWidth ||
            600;

          const computedStyle =
            window.getComputedStyle(
              container
            );

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
              scale: Math.max(
                scale,
                0.5
              ),
            });

          const pageWrapper =
            document.createElement(
              'div'
            );

          pageWrapper.className =
            'sid-pdf-page';

          const canvas =
            document.createElement(
              'canvas'
            );

          const context =
            canvas.getContext('2d');

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
            'sid-pdf-canvas';

          context.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
          );

          pageWrapper.appendChild(
            canvas
          );

          container.appendChild(
            pageWrapper
          );

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }
      } catch (error) {
        console.error(
          'Gagal memuat preview PDF:',
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

      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }

      if (blobUrl) {
        URL.revokeObjectURL(
          blobUrl
        );
      }
    };
  }, [
    showPreview,
    canPreview,
    surat,
    status,
  ]);


  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!canPreview) {
            return;
          }

          setShowPreview(
            (prev) => !prev
          );
        }}
        disabled={!canPreview}
        className={`sid-modal-preview ${
          !canPreview
            ? 'sid-preview-disabled'
            : ''
        }`}
      >
        <Eye size={16} />

        {canPreview
          ? showPreview
            ? 'Sembunyikan Preview'
            : 'Lihat Dokumen (Preview)'
          : 'Preview tersedia setelah surat selesai'}
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
              <FileText size={32} />

              <p>
                Gagal memuat preview surat.
              </p>

              <button
                type="button"
                onClick={() => {
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

          {!loading && !loadError && (
            <div
              ref={canvasContainerRef}
              className="sid-pdf-container"
            />
          )}
        </div>
      )}
    </>
  );
}


// ==========================================
// DETAIL INFORMATION
// ==========================================

function DetailInfo({
  surat,
}) {
  const infoFields = [
    {
      label: 'Nama Pemohon',
      value:
        FIELD_MAP.namaPemohon(
          surat
        ),
    },
    {
      label: 'NIK',
      value:
        FIELD_MAP.nik(surat),
    },
    {
      label: 'Alamat',
      value:
        FIELD_MAP.alamat(surat),
    },
    {
      label: 'Jenis Surat',
      value:
        FIELD_MAP.jenisSurat(
          surat
        ),
    },
    {
      label: 'Keperluan',
      value:
        FIELD_MAP.keperluan(
          surat
        ),
    },
    {
      label: 'Diajukan',
      value:
        FIELD_MAP.diajukan(
          surat
        ),
    },
    {
      label: 'Terakhir diproses',
      value:
        FIELD_MAP.terakhirDiproses(
          surat
        ),
    },
  ];

  return (
    <div className="sid-modal-info">
      {infoFields.map(
        (field) => (
          <div
            key={field.label}
          >
            <p className="sid-modal-info-label">
              {field.label}
            </p>

            <p className="sid-modal-info-value">
              {field.value}
            </p>
          </div>
        )
      )}
    </div>
  );
}


// ==========================================
// KEPUTUSAN RT
// ==========================================

function DecisionRT({
  surat,
}) {
  const keputusanRT =
    FIELD_MAP
      .riwayat(surat)
      .find(
        (r) =>
          r.stage === 'rt' ||
          r.tahap === 'RT' ||
          r.approval_level === 'rt'
      );

  if (!keputusanRT) {
    return null;
  }

  const isRejected =
    keputusanRT.status ===
    'rejected';

  const actor =
    keputusanRT.actor_name ??
    keputusanRT.decided_by ??
    keputusanRT.approved_by_name ??
    '-';

  const notes =
    keputusanRT.notes ??
    keputusanRT.reason ??
    surat.notes ??
    'Tidak ada catatan.';

  return (
    <div
      className={`sid-decision-box ${
        isRejected
          ? 'rejected'
          : 'approved'
      }`}
    >
      <div className="sid-decision-header">
        <p className="sid-decision-title">
          Keputusan RT
        </p>

        <span
          className={`sid-decision-badge ${
            isRejected
              ? 'rejected'
              : 'approved'
          }`}
        >
          {isRejected
            ? 'RT_REJECTED'
            : 'RT_APPROVED'}
        </span>
      </div>

      <div className="sid-decision-meta">
        diputuskan oleh{' '}

        <strong>
          {actor}
        </strong>
      </div>

      <div className="sid-decision-meta">
        IP{' '}

        <strong>
          {keputusanRT.ip_address ??
            '-'}
        </strong>
      </div>

      {isRejected && (
        <>
          <p className="sid-decision-comment-label">
            Komentar Penolakan
          </p>

          <div className="sid-decision-comment rejected">
            {notes}
          </div>
        </>
      )}

      {!isRejected && (
        <div className="sid-decision-comment approved">
          {notes}
        </div>
      )}
    </div>
  );
}


// ==========================================
// MAIN COMPONENT
// ==========================================

export function DetailSuratModal({
  data,
  onClose,
}) {
  if (!data) {
    return null;
  }

  return (
    <div className="sid-modal-overlay">
      <div className="sid-modal">
        {/* ======================================
            CLOSE
        ====================================== */}

        <button
          type="button"
          onClick={onClose}
          className="sid-modal-close"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>


        {/* ======================================
            HEADER
        ====================================== */}

        <h2 className="sid-modal-title">
          Detail Permohonan Surat
        </h2>

        <p className="sid-modal-subtitle">
          #
          {FIELD_MAP.noSurat(
            data
          )}
          {' · Surat saya'}
        </p>


        {/* ======================================
            STEPPER
        ====================================== */}

        <ApprovalStepperRT
          surat={data}
        />


        {/* ======================================
            DETAIL SURAT
        ====================================== */}

        <DetailInfo
          surat={data}
        />


        {/* ======================================
            KEPUTUSAN RT
        ====================================== */}

        <DecisionRT
          surat={data}
        />


        {/* ======================================
            PREVIEW
        ====================================== */}

        <SuratPreview
          surat={data}
        />


        {/* ======================================
            BUTTON KEMBALI
        ====================================== */}

        <button
          type="button"
          onClick={onClose}
          className="sid-modal-action back"
        >
          <ChevronLeft size={16} />
          Kembali
        </button>
      </div>
    </div>
  );
}