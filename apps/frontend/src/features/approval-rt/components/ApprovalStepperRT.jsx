// ==========================================
// ApprovalStepperRT.jsx
// Stepper 4 tahap (Submit -> RT -> RW -> Selesai), dihitung langsung
// dari surat.status (string dari API), bukan dari dummy statusFlow.
// ⚠️ Sesuaikan STATUS_STEP_MAP kalau nilai status dari backend beda
// (misal backend pakai 'pending_rt' bukan 'pending').
// ==========================================

import { Check, X, Loader2 } from 'lucide-react';

const STEPS = ['Submit', 'RT', 'RW', 'Selesai'];

function getStepState(status) {
  switch (status) {
    // Surat baru masuk ke RT
    case 'pending':
      return {
        step: 1,
        state: 'current',
      };

    // RT sudah approve, sekarang menunggu RW
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

    // RW sudah approve, sekarang proses menuju selesai
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

    // Kalau nanti backend punya status selesai
    case 'completed':
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

export default function ApprovalStepperRT({ surat }) {
  const { step, state } = getStepState(surat?.status);

  return (
    <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
      {STEPS.map((label, index) => {
        let circle;
        let statusText = 'Menunggu';
        let labelColor = 'text-gray-400';

        const isRejectedHere =
          (index === 1 && state === 'rejected_rt') ||
          (index === 2 && state === 'rejected_rw');

        const isDone =
          index < step ||
          (index === step && state === 'completed');

        const isCurrent =
          index === step &&
          (state === 'current');

        if (isRejectedHere) {
          circle = (
            <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center">
              <X size={18} />
            </div>
          );

          statusText = 'Ditolak';
          labelColor = 'text-red-500';

        } else if (isDone) {
          circle = (
            <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center">
              <Check size={18} />
            </div>
          );

          statusText = 'Selesai';
          labelColor = 'text-green-600';

        } else if (isCurrent) {
          circle = (
            <div className="w-9 h-9 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center">
              <Loader2
                size={16}
                className="animate-spin"
              />
            </div>
          );

          statusText = 'Menunggu';
          labelColor = 'text-green-500';

        } else {
          circle = (
            <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
          );
        }

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {circle}

              <span
                className={`text-xs font-semibold uppercase ${labelColor}`}
              >
                {label}
              </span>

              <span className="text-[10px] text-gray-400">
                {statusText}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div className="w-8 h-px bg-gray-300 mx-1 mt-[-16px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}