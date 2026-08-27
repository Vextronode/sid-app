// ==========================================
// ApprovalStepperRW.jsx
// Stepper 4 tahap:
// Submit -> RT -> RW -> Selesai
//
// Styling mengikuti SID Global Theme.
// ==========================================

import { Check, X, Loader2 } from 'lucide-react';

const STEPS = ['Submit', 'RT', 'RW', 'Selesai'];


// ==========================================
// STATUS
// ==========================================

function getStepState(status) {
  switch (status) {

    // Surat baru diajukan
    case 'pending':
      return {
        step: 1,
        state: 'current',
      };

    // RT sudah menyetujui
    case 'rt_approved':
      return {
        step: 2,
        state: 'current',
      };

    // RT menolak
    case 'rt_rejected':
      return {
        step: 1,
        state: 'rejected_rt',
      };

    // RW sudah menyetujui
    case 'rw_approved':
      return {
        step: 3,
        state: 'current',
      };

    // RW menolak
    case 'rw_rejected':
      return {
        step: 2,
        state: 'rejected_rw',
      };

    // Surat selesai
    case 'completed':
      return {
        step: 3,
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

  const { step, state } = getStepState(
    surat?.status
  );

  return (
    <div className="sid-stepper">

      {STEPS.map((label, index) => {

        let circle;
        let statusText = 'Menunggu';
        let stepState = 'waiting';


        // ==========================================
        // REJECTED
        // ==========================================

        const isRejectedRT =
          index === 1 &&
          state === 'rejected_rt';

        const isRejectedRW =
          index === 2 &&
          state === 'rejected_rw';

        const isRejectedHere =
          isRejectedRT || isRejectedRW;


        // ==========================================
        // DONE
        // ==========================================

        const isDone =
          index < step ||
          (
            index === step &&
            state === 'completed'
          );


        // ==========================================
        // CURRENT
        // ==========================================

        const isCurrent =
          index === step &&
          state === 'current';


        // ==========================================
        // REJECTED
        // ==========================================

        if (isRejectedHere) {

          stepState = 'rejected';

          circle = (
            <div className="sid-stepper-circle rejected">
              <X size={18} />
            </div>
          );

          statusText = 'Ditolak';


        // ==========================================
        // DONE
        // ==========================================

        } else if (isDone) {

          stepState = 'done';

          circle = (
            <div className="sid-stepper-circle done">
              <Check size={18} />
            </div>
          );

          statusText = 'Selesai';


        // ==========================================
        // CURRENT
        // ==========================================

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


        // ==========================================
        // WAITING
        // ==========================================

        } else {

          stepState = 'waiting';

          circle = (
            <div className="sid-stepper-circle waiting">
              {index + 1}
            </div>
          );

        }


        // ==========================================
        // RENDER STEP
        // ==========================================

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


            {/* CONNECTOR */}

            {index < STEPS.length - 1 && (

              <div className="sid-stepper-connector" />

            )}

          </div>
        );

      })}

    </div>
  );
}