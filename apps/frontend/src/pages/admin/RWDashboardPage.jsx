/* eslint-disable no-unused-vars */
// ==========================================
// RWDashboardPage.jsx
// Dashboard RW.
// Seluruh data diambil dari backend menggunakan useSuratList.
// Tidak ada lagi dummySurat.
// ==========================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ClipboardList,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useSuratList } from "@/features/approval-rw/hooks/useSuratListRW";
import StatCardRW from "@/features/approval-rw/components/StatCardRW";
import { BASE_PATH } from "@/features/approval-rw/constants/roleConfigRW";

// key harus sama dengan status database
const QUICK_NAV = [
  { key: "rt_approved", label: "pending", icon: X },
  { key: "rw_approved", label: "approved", icon: X },
  { key: "rw_rejected", label: "rejected", icon: X },
  { key: "", label: "Review", icon: X },
];

export default function RWDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ==========================
  // Ambil data dari backend
  // ==========================
  const { data } = useSuratList();

  // ==========================
  // Hitung statistik
  // ==========================
  const stats = useMemo(
    () => ({
      total: data.length,

      pending: data.filter(
        (s) => s.status === "rt_approved"
      ).length,

      approved: data.filter(
        (s) => s.status === "rw_approved"
      ).length,

      rejected: data.filter(
        (s) => s.status === "rw_rejected"
      ).length,
    }),
    [data]
  );

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-lg font-medium text-gray-700 mb-4">
        Surat RW
      </h1>

      {/* Quick Navigation */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">
        {QUICK_NAV.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() =>
                navigate(`${BASE_PATH}/list?status=${item.key}`)
              }
              className="flex flex-col items-center justify-center gap-2 border rounded-xl px-6 py-3 hover:bg-gray-50 flex-1"
            >
              <Icon
                size={16}
                className="text-gray-400"
              />

              <span className="text-sm text-gray-600">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Informasi */}
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
        <AlertTriangle size={16} />

        <span>
          Surat hanya bisa diproses RW apabila sudah
          disetujui RT (status rt_approved).
        </span>
      </div>

      <h2 className="text-base font-medium text-gray-800">
        Dashboard RW {user?.wilayah_kode ?? "001"}
      </h2>

      <p className="text-sm text-gray-500 mb-6">
        Wilayah:{" "}
        {user?.wilayah_label ??
          "RW001 - Desa Cibenda"}
      </p>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-6 max-w-2xl">
        <StatCardRW
          icon={<ClipboardList size={18} />}
          value={stats.pending}
          label="Menunggu"
        />

        <StatCardRW
          icon={<CheckCircle2 size={18} />}
          value={stats.approved}
          label="Disetujui"
        />

        <StatCardRW
          icon={<X size={18} />}
          value={stats.rejected}
          label="Ditolak"
        />

        <StatCardRW
          icon={<Bell size={18} />}
          value={stats.total}
          label="Total Surat"
        />
      </div>
    </div>
  );
}