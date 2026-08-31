import {
  ChevronDown,
  X,
  Check,
} from 'lucide-react';

export default function ApprovalActionBarRT({
  onApprove,
  onReject,
  onBack,
}) {
  return (
    <div className="sid-approval-action-bar">

      {/* SETUJU */}

      <button
        type="button"
        onClick={onApprove}
        className="sid-approval-action-bar__approve"
      >
        <ChevronDown size={16} />
        Setuju
      </button>


      {/* TOLAK */}

      <button
        type="button"
        onClick={onReject}
        className="sid-approval-action-bar__reject"
      >
        <X size={16} />
        Tolak
      </button>


      {/* KEMBALI */}

      <button
        type="button"
        onClick={onBack}
        className="sid-approval-action-bar__back"
      >
        <Check size={16} />
        Kembali
      </button>

    </div>
  );
}