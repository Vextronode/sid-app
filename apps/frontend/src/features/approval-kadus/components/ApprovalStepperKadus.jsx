
import { Check, X, Loader2 } from "lucide-react";

// ==========================================
// ApprovalStepperKadus.jsx
//
// Monitoring Kadus:
//
// Submit -> RT -> Selesai
//
// Kadus hanya melihat progress.
// Tidak ada aksi approve / reject.
// ==========================================

const STEPS = ["Submit", "RT", "Selesai"];

// ==========================================
// Normalisasi status
// ==========================================

function normalizeStatus(status) {
  if (!status) return null;

  // Jika API mengembalikan enum/object
  if (typeof status === "object") {
    return (
      status.value ??
      status.name ??
      status.status ??
      null
    );
  }

  return String(status).toLowerCase();
}

// ==========================================
// Status surat -> kondisi stepper
// ==========================================

function getStepState(status) {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
    // ========================================
    // Baru diajukan
    // Submit selesai
    // RT sedang memproses
    // ========================================

    case "pending":
      return {
        submit: "done",
        rt: "current",
        selesai: "waiting",
      };

    // ========================================
    // RT sudah approve
    // Submit selesai
    // RT selesai
    // Proses berikutnya berjalan
    // ========================================

    case "rt_approved":
      return {
        submit: "done",
        rt: "done",
        selesai: "current",
      };

    // ========================================
    // RT menolak
    // ========================================

    case "rt_rejected":
      return {
        submit: "done",
        rt: "rejected",
        selesai: "waiting",
      };

    // ========================================
    // RW sudah approve
    // Surat masih diproses menuju selesai
    // ========================================

    case "rw_approved":
      return {
        submit: "done",
        rt: "done",
        selesai: "current",
      };

    // ========================================
    // RW menolak
    // ========================================

    case "rw_rejected":
      return {
        submit: "done",
        rt: "done",
        selesai: "rejected",
      };

    // ========================================
    // Proses Kantor Desa
    // ========================================

    case "kasi_approved":
    case "kaur_tu_umum_approved":
      return {
        submit: "done",
        rt: "done",
        selesai: "current",
      };

    // ========================================
    // Surat sudah selesai
    // ========================================

    case "petugas_desa_approved":
    case "completed":
      return {
        submit: "done",
        rt: "done",
        selesai: "done",
      };

    // ========================================
    // Fallback
    // ========================================

    default:
      return {
        submit: "waiting",
        rt: "waiting",
        selesai: "waiting",
      };
  }
}

// ==========================================
// COMPONENT
// ==========================================

export default function ApprovalStepperKadus({ surat }) {
  const status = surat?.status;

  const stepState = getStepState(status);

  const states = [
    stepState.submit,
    stepState.rt,
    stepState.selesai,
  ];

  return (
    <div className="sid-stepper">
      {STEPS.map((label, index) => {
        const currentState = states[index];

        const isRejected =
          currentState === "rejected";

        const isDone =
          currentState === "done";

        const isCurrent =
          currentState === "current";

        const isWaiting =
          currentState === "waiting";

        // ==================================
        // STEP CLASS
        // ==================================

        const stepClass = isRejected
          ? "rejected"
          : isDone
            ? "done"
            : isCurrent
              ? "current"
              : "waiting";

        return (
          <div
            key={label}
            className="sid-stepper-item"
          >
            <div className="sid-stepper-content">

              {/* ==================================
                  Circle
              ================================== */}

              <div
                className={`sid-stepper-circle ${stepClass}`}
              >
                {isRejected ? (
                  <X
                    size={18}
                    strokeWidth={2.5}
                  />
                ) : isDone ? (
                  <Check
                    size={18}
                    strokeWidth={2.5}
                  />
                ) : isCurrent ? (
                  <Loader2
                    size={16}
                    strokeWidth={2.5}
                    className="animate-spin"
                  />
                ) : (
                  index + 1
                )}
              </div>

              {/* ==================================
                  Label
              ================================== */}

              <span
                className={`sid-stepper-label ${stepClass}`}
              >
                {label}
              </span>

              {/* ==================================
                  Status
              ================================== */}

              <span className="sid-stepper-status">
                {isRejected && "Ditolak"}
                {isDone && "Selesai"}
                {isCurrent && "Menunggu"}
                {isWaiting && "Menunggu"}
              </span>
            </div>

            {/* ==================================
                Connector
            ================================== */}

            {index < STEPS.length - 1 && (
              <div className="sid-stepper-connector" />
            )}
          </div>
        );
      })}
    </div>
  );
}
