import {
  Check,
} from 'lucide-react';

export default function ApprovalActionBarRW({
  onBack,
}) {
  return (
    <div className="sid-approval-action-bar">

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