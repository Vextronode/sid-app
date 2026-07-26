/* eslint-disable no-unused-vars */
// ==========================================
// ApprovalStepperRW.jsx
// Stepper 4 tahap (Submit -> RT -> RW -> Selesai), dari surat.status.
// ⚠️ Sesuaikan getStepState kalau nilai status dari backend beda.
// ==========================================

import { Check, X, Loader2 } from 'lucide-react';

const STEPS = ['Submit', 'RT', 'RW', 'Selesai'];

function getStepState(status) {
  const map = {
    pending: { step: 1, state: 'current' },
    rt_approved: { step: 2, state: 'current_rw' },
    rt_rejected: { step: 1, state: 'rejected_rt' },
    rw_approved: { step: 3, state: 'done_rw' },
    rw_rejected: { step: 2, state: 'rejected_rw' },
  };
  return map[status] ?? { step: 0, state: 'waiting' };
}

export default function ApprovalStepperRW({ surat }) {
  const { step, state } = getStepState(surat?.status);

  return (
    <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
      {STEPS.map((label, index) => {
        let circle;
        let statusText = 'Menunggu';
        let labelColor = 'text-gray-400';

        const isRejectedHere = (index === 1 && state === 'rejected_rt') || (index === 2 && state === 'rejected_rw');
        const isDoneRT = index === 1 && (state === 'current_rw' || state === 'done_rw');
        const isDoneRW = index === 2 && state === 'done_rw';
        const isCurrentSubmit = index === 0;
        const isCurrentRW = index === 2 && state === 'current_rw';
        const isCurrentPending = index === step && state === 'current';

        if (isRejectedHere) {
          circle = <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={18} /></div>;
          statusText = 'Ditolak';
          labelColor = 'text-red-500';
        } else if (isDoneRT || isDoneRW || (index === 0)) {
          circle = <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center"><Check size={18} /></div>;
          statusText = 'Disetujui';
          labelColor = 'text-green-600';
        } else if (isCurrentRW || isCurrentPending) {
          circle = <div className="w-9 h-9 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center"><Loader2 size={16} className="animate-spin" /></div>;
          statusText = 'Menunggu';
          labelColor = 'text-green-500';
        } else {
          circle = <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">{index + 1}</div>;
        }

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {circle}
              <span className={`text-xs font-semibold uppercase ${labelColor}`}>{label}</span>
              <span className="text-[10px] text-gray-400">{statusText}</span>
            </div>
            {index < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1 mt-[-16px]" />}
          </div>
        );
      })}
    </div>
  );
}