import { STATUS_BADGE } from '@/features/approval/constants/statusFlow';
export default function StatusBadgekasi({ status }) {
  const config = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
}