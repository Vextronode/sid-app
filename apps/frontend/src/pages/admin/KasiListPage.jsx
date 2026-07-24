/* eslint-disable no-unused-vars */

// ==========================================
// KasiListPage.jsx
// List surat Kasi.
// Kasi menerima surat setelah Kadus approve.
// Status:
// kadus_approved -> kasi_approved / kasi_rejected
// ==========================================

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


import {
  useSuratListKasi
} from "@/features/approval-kasi/hooks/useSuratListKasi";


import {
  useApprovalActionKasi
} from "@/features/approval-kasi/hooks/useApprovalActionKasi";


import SuratTableKasi from "@/features/approval-kasi/components/SuratTableKasi";
import SearchFilterBarKasi from "@/features/approval-kasi/components/SearchFilterBarKasi";
import PaginationKasi from "@/features/approval-kasi/components/PaginationKasi";
import SuratDetailModalKasi from "@/features/approval-kasi/components/SuratDetailModalKasi";


import {
  BASE_PATH
} from "@/features/approval-kasi/constants/roleConfigKasi";



export default function KasiListPage() {


  const navigate = useNavigate();


  const [searchParams] =
    useSearchParams();


  const initialStatus =
    searchParams.get("status") ?? "";



  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);



  const [
    selectedId,
    setSelectedId,
  ] = useState(null);



  const [
    isReadOnly,
    setIsReadOnly,
  ] = useState(false);





  // ==========================================
  // Ambil data surat Kasi
  // ==========================================
  const {

    data,

    refresh,

    setSearch,

    setFilterJenis,

    filterStatus,

    setFilterStatus,

  } = useSuratListKasi({

    initialStatus

  });





  // ==========================================
  // Ambil jenis surat unik
  // ==========================================
  const suratTypes = [

    ...new Map(

      data

      .filter(
        item => item.letter_type
      )

      .map(item => [

        item.letter_type.id,

        item.letter_type

      ])

    ).values()

  ];





  const {

    approve,

    reject,

  } = useApprovalActionKasi();






  useEffect(()=>{


    setFilterStatus(initialStatus);


  },[

    initialStatus,

    setFilterStatus

  ]);






  // ==========================================
  // Delete sementara belum tersedia
  // ==========================================
  const handleDelete = () => {

    alert(
      "Fitur hapus belum tersedia."
    );

  };







  // ==========================================
  // Approve surat Kasi
  // ==========================================
  const handleApprove = async()=>{


    await approve(selectedId);


    await refresh();


    setSelectedId(null);


  };







  // ==========================================
  // Reject surat Kasi
  // ==========================================
  const handleReject = async(notes)=>{


    await reject(

      selectedId,

      notes

    );


    await refresh();


    setSelectedId(null);


  };







  return (

    <div className="max-w-5xl mx-auto p-6">



      <div className="flex items-center justify-between mb-4">


        <h2 className="font-medium text-gray-800">

          Semua permohonan surat

        </h2>



        <button

          className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm"

        >

          Tambah Surat

        </button>


      </div>







      <SearchFilterBarKasi

        onSearch={setSearch}

        onFilterJenis={setFilterJenis}

        onFilterStatus={setFilterStatus}

        selectedStatus={filterStatus}

        suratTypes={suratTypes}

      />








      <SuratTableKasi

        data={data}


        onView={(id)=>{


          navigate(

            `/admin/dashboard-surat-kasi/detail-permohonan/${id}`

          );


        }}



        onEdit={(id)=>{


          setSelectedId(id);


          setIsReadOnly(false);


        }}



        onDelete={handleDelete}


      />








      <div className="flex items-center justify-between mt-4">



        <button

          onClick={()=>navigate(BASE_PATH)}

          className="border border-green-500 text-green-600 rounded-full px-4 py-1.5 text-sm"

        >

          Kembali

        </button>





        <PaginationKasi

          currentPage={currentPage}

          totalPages={3}

          onPageChange={setCurrentPage}

        />


      </div>








      <SuratDetailModalKasi

        suratId={selectedId}

        readOnly={isReadOnly}


        onClose={()=>{


          setSelectedId(null);


          setIsReadOnly(false);


        }}



        onApprove={handleApprove}


        onReject={handleReject}


      />



    </div>

  );

}