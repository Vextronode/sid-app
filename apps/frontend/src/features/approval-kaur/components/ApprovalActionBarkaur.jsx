import { ChevronDown, X, Check } from 'lucide-react';
export default function ApprovalActionBarkaur({ onApprove, onReject, onBack }) {
  return (
    <div className="flex gap-3">
      <button onClick={onApprove} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"><ChevronDown size={16} /> Setuju</button>
      <button onClick={onReject} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"><X size={16} /> Tolak</button>
      <button onClick={onBack} className="flex items-center gap-2 border border-green-500 text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50"><Check size={16} /> Kembali</button>
    </div>
  );
}