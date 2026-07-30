const STATUS_LABELS = {
  pending: "Menunggu",
  rt_approved: "Approved by RT",
  rw_approved: "Approved by RW",
  kadus_approved: "Approved by Kadus",
  kasi_approved: " Selesai",
  rejected: "Ditolak",
};

export function StatusBadge({ status }) {
  const lowerStatus = status.toLowerCase();

  let bgClass = "bg-gray-100 text-gray-800";

  if (lowerStatus === "pending") {
    bgClass = "bg-[#FFEFBD] text-black";
  } else if (lowerStatus.includes("rejected")) {
    bgClass = "bg-[#E53835]/40 text-black";
  } else if (lowerStatus.includes("approved")) {
    bgClass = "bg-[#2E7D31]/40 text-black";
  }

  const label = STATUS_LABELS[lowerStatus] ?? status;

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] md:text-xs font-medium tracking-wide ${bgClass}`}
    >
      {label}
    </span>
  );
}