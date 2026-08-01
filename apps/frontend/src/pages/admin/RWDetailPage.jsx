// ==========================================
// RWDetailPage.jsx
// Detail surat RW.
// Mengikuti struktur RT:
// - Load detail dari API
// - Approve / Reject via backend
// - Menampilkan history approval
// ==========================================

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useSuratDetail } from "@/features/approval-rw/hooks/useSuratDetailRW";
import { useApprovalAction } from "@/features/approval-rw/hooks/useApprovalActionRW";

import ApprovalStepperRW from "@/features/approval-rw/components/ApprovalStepperRW";
import SuratInfoGridRW from "@/features/approval-rw/components/SuratInfoGridRW";
import ApprovalActionBarRW from "@/features/approval-rw/components/ApprovalActionBarRW";
import RejectReasonModalRW from "@/features/approval-rw/components/RejectReasonModalRW";
import ApprovalHistoryRW from "@/features/approval-rw/components/ApprovalHistoryRW";

import { BASE_PATH } from "@/features/approval-rw/constants/roleConfigRW";


export default function RWDetailPage(){

  const { id } = useParams();

  const navigate = useNavigate();
  

  const {
    surat,
    isLoading,
    notFound
  } = useSuratDetail(id);


  const {
    approve,
    reject
  } = useApprovalAction();



  const [
    rejectModalOpen,
    setRejectModalOpen
  ] = useState(false);



  // ============================
  // Loading
  // ============================
  if(isLoading){

    return (
      <p className="text-center py-10">
        Memuat surat...
      </p>
    );

  }



  // ============================
  // Tidak ditemukan
  // ============================
  if(notFound || !surat){

    return (
      <p className="text-center py-10 text-gray-500">
        Surat tidak ditemukan.
      </p>
    );

  }



  // ============================
  // Approve RW
  // ============================
  const handleApprove = async()=>{

    try{

      await approve(surat.id);


      alert(
        "Surat berhasil disetujui"
      );


      navigate(
        `${BASE_PATH}/list`
      );


    }catch(error){

      console.error(
        error
      );


      alert(
        "Gagal Menyetujui surat"
      );

    }

  };




  // ============================
  // Reject RW
  // ============================
  const handleReject = async(notes)=>{

    try{

      await reject(
        surat.id,
        notes
      );


      alert(
        "Surat berhasil ditolak"
      );


      setRejectModalOpen(false);


      navigate(
        `${BASE_PATH}/list`
      );


    }catch(error){

      console.error(
        error
      );


      alert(
        "Gagal menolak surat"
      );

    }

  };



  return (

    <div className="max-w-2xl mx-auto py-16">

      <div className="bg-white rounded-2xl shadow-sm p-8">


        <h2 className="font-medium text-gray-800">
          Detail Permohonan Surat
        </h2>


        <p className="text-xs text-gray-400 mb-6">

          #{surat.letter_number ?? "-"}

          {" "}· Surat warga

        </p>



        <ApprovalStepperRW
          surat={surat}
        />



        <SuratInfoGridRW
          surat={surat}
        />



          <ApprovalHistoryRW
              approvals={surat.approvals}
          />



        <ApprovalActionBarRW

          onApprove={handleApprove}

          onReject={()=>
            setRejectModalOpen(true)
          }

          onBack={()=>
            navigate(`${BASE_PATH}/list`)
          }

        />


      </div>



      <RejectReasonModalRW

        open={rejectModalOpen}

        onClose={()=>
          setRejectModalOpen(false)
        }

        onSubmit={handleReject}

      />


    </div>

  );

}