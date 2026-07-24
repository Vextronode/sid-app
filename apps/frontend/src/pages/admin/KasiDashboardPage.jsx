/* eslint-disable no-unused-vars */
// ==========================================
// KasiDashboardPage.jsx
// Dashboard Kasi.
// Seluruh data diambil dari backend menggunakan useSuratListKasi.
// Kasi merupakan approval final surat.
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

import {
  useSuratListKasi
} from "@/features/approval-kasi/hooks/useSuratListKasi";


import StatCardKasi
from "@/features/approval-kasi/components/StatCardKasi";


import {
  BASE_PATH
} from "@/features/approval-kasi/constants/roleConfigKasi";




// key harus sama dengan status database
const QUICK_NAV = [

  {
    key: "kadus_approved",
    label: "Pending",
    icon: X
  },


  {
    key: "kasi_approved",
    label: "Approved",
    icon: X
  },


  {
    key: "kasi_rejected",
    label: "Rejected",
    icon: X
  },


  {
    key: "",
    label: "Review",
    icon: X
  },

];





export default function KasiDashboardPage() {


  const {
    user
  } = useAuth();



  const navigate =
    useNavigate();




  // ==========================
  // Ambil data dari backend
  // ==========================
  const {
    data
  } = useSuratListKasi();






  // ==========================
  // Hitung statistik
  // ==========================
  const stats = useMemo(

    () => ({


      total:
        data.length,



      pending:
        data.filter(
          (s) =>
            s.status === "kadus_approved"
        ).length,



      approved:
        data.filter(
          (s) =>
            s.status === "kasi_approved"
        ).length,



      rejected:
        data.filter(
          (s) =>
            s.status === "kasi_rejected"
        ).length,


    }),


    [data]

  );







  return (

    <div className="max-w-5xl mx-auto py-6">


      <h1 className="text-lg font-medium text-gray-700 mb-4">

        Surat Kasi

      </h1>






      {/* Quick Navigation */}

      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4 mb-6">


        {QUICK_NAV.map((item)=>{


          const Icon =
            item.icon;



          return (

            <button

              key={item.label}

              onClick={() =>
                navigate(
                  `${BASE_PATH}/list?status=${item.key}`
                )
              }
              

              className="
                flex
                flex-col
                items-center
                justify-center
                gap-2
                border
                rounded-xl
                px-6
                py-3
                hover:bg-gray-50
                flex-1
              "

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

      <div
        className="
          bg-yellow-50
          border
          border-yellow-200
          text-yellow-800
          text-sm
          rounded-lg
          px-4
          py-3
          mb-6
          flex
          items-center
          gap-2
        "
      >

        <AlertTriangle size={16}/>


        <span>

          Surat hanya bisa diproses Kasi apabila
          sudah disetujui Kepala Dusun
          (status kadus_approved).

        </span>


      </div>








      <h2 className="text-base font-medium text-gray-800">

        Dashboard Kasi {user?.wilayah_kode ?? "001"}

      </h2>





      <p className="text-sm text-gray-500 mb-6">

        Wilayah:{" "}

        {
          user?.wilayah_label ??
          "Desa"
        }

      </p>








      {/* Statistik */}

      <div className="grid grid-cols-2 gap-6 max-w-2xl">


        <StatCardKasi

          icon={
            <ClipboardList size={18}/>
          }

          value={stats.pending}

          label="Menunggu"

        />




        <StatCardKasi

          icon={
            <CheckCircle2 size={18}/>
          }

          value={stats.approved}

          label="Disetujui"

        />




        <StatCardKasi

          icon={
            <X size={18}/>
          }

          value={stats.rejected}

          label="Ditolak"

        />




        <StatCardKasi

          icon={
            <Bell size={18}/>
          }

          value={stats.total}

          label="Total Surat"

        />


      </div>



    </div>

  );


}