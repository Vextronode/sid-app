// ==========================================
// ApprovalHistoryKadus.jsx
// Riwayat approval berdasarkan response Laravel.
// approved_by ada = approved.
// approved_by null = menunggu.
// ==========================================

export default function ApprovalHistoryKadus({
  approvals = [],
}) {

  if (!approvals || approvals.length === 0) {

    return (
      <div className="mt-6">

        <h3 className="font-medium text-gray-800 mb-3">
          Riwayat Persetujuan
        </h3>

        <p className="text-sm text-gray-400">
          Belum ada riwayat persetujuan.
        </p>

      </div>
    );

  }

  return (

    <div className="mt-6">

      <h3 className="font-medium text-gray-800 mb-3">
        Riwayat Persetujuan
      </h3>

      <div className="space-y-3">

        {approvals.map((approval) => {

          const isApproved = !!approval.approved_by;

          return (

            <div
              key={approval.id}
              className="border rounded-lg p-3 text-sm"
            >

              <div className="flex justify-between items-center">

                <span className="font-medium text-gray-800">
                  {approval.approval_level?.toUpperCase() ?? "-"}
                </span>

                <span
                  className={
                    isApproved
                      ? "text-green-600 font-medium"
                      : "text-yellow-600 font-medium"
                  }
                >
                  {isApproved
                    ? "Disetujui"
                    : "Menunggu"}
                </span>

              </div>

              <div className="mt-2 space-y-1 text-gray-500">

                {approval.approved_by?.name && (
                  <p>
                    Oleh: {approval.approved_by.name}
                  </p>
                )}

                {approval.notes && (
                  <p>
                    Catatan: {approval.notes}
                  </p>
                )}

                {approval.updated_at && (
                  <p className="text-xs text-gray-400">
                    {new Date(
                      approval.updated_at
                    ).toLocaleString("id-ID")}
                  </p>
                )}

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}