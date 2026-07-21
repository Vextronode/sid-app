import { Check, Clock, X } from 'lucide-react';
import { getStepStatuses } from '@/features/approval/constants/statusFlow';

export default function ApprovalStepperkaur({ surat }) {
  const steps = getStepStatuses(surat);
  return (
    <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
      {steps.map((step, index) => {
        let circleClass = 'bg-gray-200 text-gray-500';
        let icon = index + 1;
        let statusText = 'Menunggu';
        if (step.state === 'done') { circleClass = 'bg-green-500 text-white'; icon = <Check size={16} />; statusText = step.timestamp ?? 'Selesai'; }
        else if (step.state === 'rejected') { circleClass = 'bg-red-500 text-white'; icon = <X size={16} />; statusText = step.timestamp ? `Ditolak · ${step.timestamp}` : 'Ditolak'; }
        else if (step.state === 'current') { circleClass = 'bg-yellow-100 text-yellow-600'; icon = <Clock size={16} />; statusText = 'Sedang diproses'; }
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${circleClass}`}>{icon}</div>
              <span className="text-xs text-gray-600 text-center w-20">{step.label}</span>
              <span className="text-[10px] text-gray-400 text-center w-20">{statusText}</span>
            </div>
            {index < steps.length - 1 && <div className="w-10 h-px bg-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}