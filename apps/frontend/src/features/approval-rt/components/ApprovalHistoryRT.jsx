export default function ApprovalHistoryRT({
  approvals = [],
  suratStatus,
}) {
  return (
    <div className="mt-8">

      <h3 className="font-medium text-gray-800 mb-3">
        Riwayat Persetujuan
      </h3>

      <div className="space-y-3">

        {approvals.length === 0 && (
          <p className="text-sm text-gray-400">
            Belum ada riwayat persetujuan.
          </p>
        )}

        {approvals.map((item) => (

          <div
            key={item.id}
            className="border rounded-lg p-3 text-sm"
          >

            <div>
              <span className="text-gray-500">
                Level:
              </span>{" "}
              {item.approval_level?.toUpperCase() ?? "-"}
            </div>


            <div>
              <span className="text-gray-500">
                Diproses oleh:
              </span>{" "}
              {item.approved_by?.name ?? "Belum diproses"}
            </div>


            <div>
              <span className="text-gray-500">
                Status:
              </span>{" "}

              {
                item.approval_level === "rt" &&
                suratStatus === "rt_rejected"
                  ? "Ditolak"
                  : item.approved_by
                  ? "Disetujui"
                  : "Menunggu"
              }

            </div>


            <div>
              <span className="text-gray-500">
                Waktu:
              </span>{" "}

              {item.approved_by
                ? new Date(
                    item.updated_at
                  ).toLocaleString("id-ID")
                : "-"
              }

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}