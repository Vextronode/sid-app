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
    case 'pending':
      return {
        step: 1,
        state: 'current',
      };

    case 'rt_approved':
      return {
        step: 2,
        state: 'current',
      };

    case 'rt_rejected':
      return {
        step: 1,
        state: 'rejected_rt',
      };

    // Status lama tetap dipertahankan
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

    case 'completed':
      return {
        step: 2,
        state: 'completed',
      };

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

        // ==================================
        // REJECT RT
        // ==================================

        const isRejectedRT =
          index === 1 &&
          state === 'rejected_rt';

        // ==================================
        // REJECT RW
        //
        // Status lama tetap dikenali.
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
          circle = (
            <div className="sid-stepper-circle waiting">
              {index + 1}
            </div>
          );
        }

        const stepClass = isRejectedHere
          ? 'rejected'
          : isDone
            ? 'done'
            : isCurrent
              ? 'current'
              : 'waiting';

        return (
          <div
            key={label}
            className="sid-stepper-item"
          >
            <div className="sid-stepper-content">
              {circle}

              <span
                className={`sid-stepper-label ${stepClass}`}
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