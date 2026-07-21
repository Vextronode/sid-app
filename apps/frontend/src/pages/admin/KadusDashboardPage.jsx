/* eslint-disable no-unused-vars */
// ==========================================
// KadusDashboardPage.jsx
// Dashboard Kadus.
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

import { useSuratListKadus } from "@/features/approval-kadus/hooks/useSuratListKadus";

import StatCardKadus from "@/features/approval-kadus/components/StatCardKadus";

import { BASE_PATH } from "@/features/approval-kadus/constants/roleConfigKadus";

const QUICK_NAV = [
  {
    key: "rw_approved",
    label: "Pending",
    icon: X,
  },
  {
    key: "kadus_approved",
    label: "Approved",
    icon: X,
  },
  {
    key: "kadus_rejected",
    label: "Rejected",
    icon: X,
  },
  {
    key: "",
    label: "Review",
    icon: X,
  },
];

export default function KadusDashboardPage() {

  const { user } = useAuth();

  const navigate = useNavigate();

  const { data } = useSuratListKadus();

  const stats = useMemo(() => ({

    total: data.length,

    pending: data.filter(
      (s) => s.status === "rw_approved"
    ).length,

    approved: data.filter(
      (s) => s.status === "kadus_approved"
    ).length,

    rejected: data.filter(
      (s) => s.status === "kadus_rejected"
    ).length,

  }), [data]);

  return (

    <div className="max-w-5xl mx-auto py-6">

      <h1 className="text-lg font-medium text-gray-700 mb-4">
        Surat Kadus
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
          Surat hanya bisa diproses Kepala Dusun apabila
          sudah disetujui RW (status rw_approved).
        </span>

      </div>

      <h2 className="text-base font-medium text-gray-800">
        Dashboard Kadus
      </h2>

      <p className="text-sm text-gray-500 mb-6">

        Wilayah:{" "}

        {user?.wilayah_label ??
          "Dusun"}

      </p>

      {/* Statistik */}

      <div className="grid grid-cols-2 gap-6 max-w-2xl">

        <StatCardKadus
          icon={<ClipboardList size={18} />}
          value={stats.pending}
          label="Menunggu"
        />

        <StatCardKadus
          icon={<CheckCircle2 size={18} />}
          value={stats.approved}
          label="Disetujui"
        />

        <StatCardKadus
          icon={<X size={18} />}
          value={stats.rejected}
          label="Ditolak"
        />

        <StatCardKadus
          icon={<Bell size={18} />}
          value={stats.total}
          label="Total Surat"
        />

      </div>

    </div>

  );

}