// ==========================================
// ApprovalStepperRT.jsx
// Stepper 4 tahap:
// Submit -> RT -> RW -> Selesai
//
// Status dihitung langsung dari surat.status
// yang dikirim oleh API.
// ==========================================

import { Check, X, Loader2 } from 'lucide-react';

const STEPS = [
  'Submit',
  'RT',
  'RW',
  'Selesai',
];


// ==========================================
// GET STEP STATE
// ==========================================

function getStepState(status) {
  switch (status) {

    // ========================================
    // SURAT BARU MASUK KE RT
    // ========================================

    case 'pending':
      return {
        step: 1,
        state: 'current',
      };


    // ========================================
    // RT SUDAH APPROVE
    // MENUNGGU RW
    // ========================================

    case 'rt_approved':
      return {
        step: 2,
        state: 'current',
      };


    // ========================================
    // RT MENOLAK
    // ========================================

    case 'rt_rejected':
      return {
        step: 1,
        state: 'rejected_rt',
      };


    // ========================================
    // RW SUDAH APPROVE
    // PROSES MENUJU SELESAI
    // ========================================

    case 'rw_approved':
      return {
        step: 3,
        state: 'current',
      };


    // ========================================
    // RW MENOLAK
    // ========================================

    case 'rw_rejected':
      return {
        step: 2,
        state: 'rejected_rw',
      };


    // ========================================
    // SELESAI
    // ========================================

    case 'completed':
      return {
        step: 3,
        state: 'completed',
      };


    // ========================================
    // DEFAULT
    // ========================================

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

export default function ApprovalStepperRT({ surat }) {
  const {
    step,
    state,
  } = getStepState(surat?.status);


  return (
    <div className="sid-stepper">

      {STEPS.map((label, index) => {

        let circle;
        let statusText = 'Menunggu';
        let labelClass = 'sid-stepper-label waiting';


        // ======================================
        // REJECTED
        // ======================================

        const isRejectedHere =
          (index === 1 && state === 'rejected_rt') ||
          (index === 2 && state === 'rejected_rw');


        // ======================================
        // DONE
        // ======================================

        const isDone =
          index < step ||
          (
            index === step &&
            state === 'completed'
          );


        // ======================================
        // CURRENT
        // ======================================

        const isCurrent =
          index === step &&
          state === 'current';


        // ======================================
        // REJECTED CIRCLE
        // ======================================

        if (isRejectedHere) {

          circle = (
            <div className="sid-stepper-circle rejected">
              <X size={18} />
            </div>
          );

          statusText = 'Ditolak';
          labelClass = 'sid-stepper-label rejected';

        }


        // ======================================
        // DONE CIRCLE
        // ======================================

        else if (isDone) {

          circle = (
            <div className="sid-stepper-circle done">
              <Check size={18} />
            </div>
          );

          statusText = 'Selesai';
          labelClass = 'sid-stepper-label done';

        }


        // ======================================
        // CURRENT CIRCLE
        // ======================================

        else if (isCurrent) {

          circle = (
            <div className="sid-stepper-circle current">
              <Loader2
                size={16}
                className="animate-spin"
              />
            </div>
          );

          statusText = 'Menunggu';
          labelClass = 'sid-stepper-label current';

        }


        // ======================================
        // WAITING CIRCLE
        // ======================================

        else {

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

            {/* ==================================
                STEP
            ================================== */}

            <div className="sid-stepper-content">

              {circle}

              <span className={labelClass}>
                {label}
              </span>

              <span className="sid-stepper-status">
                {statusText}
              </span>

            </div>


            {/* ==================================
                CONNECTOR
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