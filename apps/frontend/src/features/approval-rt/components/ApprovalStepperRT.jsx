// ==========================================
// ApprovalStepperRT.jsx
// Stepper 3 tahap:
//
// Submit -> RT -> Selesai
//
// RW tidak lagi menjadi tahap keputusan.
// Status rw_approved / rw_rejected tetap
// dikenali untuk kompatibilitas data lama.
//
// Status dihitung langsung dari surat.status
// yang dikirim oleh API.
// ==========================================

import {
  Check,
  X,
  Loader2,
} from 'lucide-react';

const STEPS = [
  'Submit',
  'RT',
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
    // LANGSUNG MENUJU PROSES TTD
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
    // STATUS LEGACY RW
    //
    // Tetap dikenali agar data lama tidak
    // membuat stepper kembali ke waiting.
    // RW bukan lagi gate proses.
    // ========================================

    case 'rw_approved':
      return {
        step: 2,
        state: 'current',
      };


    case 'rw_rejected':
      return {
        step: 2,
        state: 'current',
      };


    // ========================================
    // PROSES KANTOR DESA SELESAI
    // ========================================

    case 'kasi_approved':
    case 'kaur_tu_umum_approved':
    case 'petugas_desa_approved':
    case 'completed':
      return {
        step: 2,
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

export default function ApprovalStepperRT({
  surat,
}) {
  const {
    step,
    state,
  } = getStepState(
    surat?.status
  );


  return (
    <div className="sid-stepper">

      {STEPS.map((label, index) => {

        let circle;
        let statusText =
          'Menunggu';

        let labelClass =
          'sid-stepper-label waiting';


        // ======================================
        // REJECTED
        // ======================================

        const isRejectedHere =
          index === 1 &&
          state === 'rejected_rt';


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

          labelClass =
            'sid-stepper-label rejected';

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

          labelClass =
            'sid-stepper-label done';

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

          // ==================================
          // RT
          // ==================================

          if (index === 1) {
            statusText = 'Menunggu';
          }

          // ==================================
          // SELESAI
          // ==================================

          if (index === 2) {
            statusText = 'Menunggu TTD';
          }

          labelClass =
            'sid-stepper-label current';

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

              <span
                className={labelClass}
              >
                {label}
              </span>

              <span className="sid-stepper-status">
                {statusText}
              </span>

            </div>


            {/* ==================================
                CONNECTOR
            ================================== */}

            {index <
              STEPS.length - 1 && (

              <div className="sid-stepper-connector" />

            )}

          </div>
        );
      })}

    </div>
  );
}