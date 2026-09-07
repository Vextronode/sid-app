// ==========================================
// ApprovalStepperRW.jsx
// Stepper 3 tahap:
// Submit -> RT -> Selesai
//
// Catatan:
// - RW sudah tidak menjadi tahap keputusan.
// - RT adalah satu-satunya tahap approval.
// - Selesai merepresentasikan proses setelah RT,
//   termasuk proses TTD.
// - Logic status lanjutan tetap dipertahankan.
// ==========================================

import { Check, X, Loader2 } from 'lucide-react';

// ==========================================
// STEPS
// ==========================================

const STEPS = ['Submit', 'RT', 'Selesai'];

// ==========================================
// STATUS MAPPING
// ==========================================

function getStepState(status) {
  switch (status) {
    // --------------------------------------
    // Pengajuan baru
    // --------------------------------------
    case 'pending':
      return {
        step: 1,
        state: 'current',
      };

    // --------------------------------------
    // RT sudah menyetujui
    // RT selesai -> proses menuju Selesai
    // --------------------------------------
    case 'rt_approved':
      return {
        step: 2,
        state: 'current',
      };

    // --------------------------------------
    // RT menolak
    // --------------------------------------
    case 'rt_rejected':
      return {
        step: 1,
        state: 'rejected_rt',
      };

    // --------------------------------------
    // Status lama setelah proses RW.
    //
    // Tetap dipertahankan agar status lama
    // tidak merusak tampilan proses lanjutan.
    // Secara visual sekarang masuk ke tahap
    // Selesai.
    // --------------------------------------
    case 'rw_approved':
      return {
        step: 2,
        state: 'current',
      };

    case 'rw_rejected':
      return {
        step: 2,
        state: 'rejected_rw',
      };

    // --------------------------------------
    // Proses selesai / TTD selesai
    // --------------------------------------
    case 'completed':
      return {
        step: 2,
        state: 'completed',
      };

    // --------------------------------------
    // Status tahap kantor / TTD yang sudah
    // dianggap selesai.
    //
    // Dipertahankan mengikuti alur existing.
    // --------------------------------------
    case 'kasi_approved':
    case 'kaur_tu_umum_approved':
    case 'petugas_desa_approved':
      return {
        step: 2,
        state: 'completed',
      };

    default:
      return {
        step: 0,
        state: 'waiting',
      };
  }
}

// ==========================================
// COMPONENT
// ==========================================

export default function ApprovalStepperRW({ surat }) {
  const { step, state } = getStepState(surat?.status);

  return (
    <div className="sid-stepper">

      {STEPS.map((label, index) => {

        let circle;
        let statusText = 'Menunggu';
        let stepState = 'waiting';

        // ==================================
        // REJECT RT
        // ==================================

        const isRejectedRT =
          index === 1 &&
          state === 'rejected_rt';

        // ==================================
        // REJECT RW
        //
        // Status lama tetap dikenali supaya
        // data lama tidak membuat stepper error.
        // ==================================

        const isRejectedRW =
          index === 2 &&
          state === 'rejected_rw';

        const isRejectedHere =
          isRejectedRT || isRejectedRW;

        // ==================================
        // DONE
        // ==================================

        const isDone =
          index < step ||
          (
            index === step &&
            state === 'completed'
          );

        // ==================================
        // CURRENT
        // ==================================

        const isCurrent =
          index === step &&
          state === 'current';

        // ==================================
        // REJECTED
        // ==================================

        if (isRejectedHere) {

          stepState = 'rejected';

          circle = (
            <div className="sid-stepper-circle rejected">
              <X size={18} />
            </div>
          );

          statusText = 'Ditolak';

        // ==================================
        // DONE
        // ==================================

        } else if (isDone) {

          stepState = 'done';

          circle = (
            <div className="sid-stepper-circle done">
              <Check size={18} />
            </div>
          );

          statusText = 'Selesai';

        // ==================================
        // CURRENT
        // ==================================

        } else if (isCurrent) {

          stepState = 'current';

          circle = (
            <div className="sid-stepper-circle current">
              <Loader2
                size={16}
                className="animate-spin"
              />
            </div>
          );

          statusText = 'Menunggu';

        // ==================================
        // WAITING
        // ==================================

        } else {

          stepState = 'waiting';

          circle = (
            <div className="sid-stepper-circle waiting">
              {index + 1}
            </div>
          );

        }

        return (
          <div
            key={label}
            className="sid-stepper-item"
          >

            <div className="sid-stepper-content">

              {circle}

              <span
                className={`sid-stepper-label ${stepState}`}
              >
                {label}
              </span>

              <span className="sid-stepper-status">
                {statusText}
              </span>

            </div>

            {index < STEPS.length - 1 && (
              <div className="sid-stepper-connector" />
            )}

          </div>
        );
      })}

    </div>
  );
}