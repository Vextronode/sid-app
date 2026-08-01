/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useSuratDetail } from '@/features/approval-rt/hooks/useSuratDetail';
import { useApprovalAction } from '@/features/approval-rt/hooks/useApprovalAction';

import ApprovalStepperRT from '@/features/approval-rt/components/ApprovalStepperRT';
import SuratInfoGridRT from '@/features/approval-rt/components/SuratInfoGridRT';
import ApprovalActionBarRT from '@/features/approval-rt/components/ApprovalActionBarRT';
import RejectReasonModalRT from '@/features/approval-rt/components/RejectReasonModalRT';
import ApprovalHistoryRT from '@/features/approval-rt/components/ApprovalHistoryRT';
import { BASE_PATH } from '@/features/approval-rt/constants/roleConfig';


export default function RTDetailPage(){

  const {id}=useParams();

  const navigate=useNavigate();


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



  if(isLoading){

    return (
      <p className="text-center py-10">
        Memuat surat...
      </p>
    );

  }


  if(notFound || !surat){

    return (
      <p className="text-center py-10 text-gray-500">
        Surat tidak ditemukan.
      </p>
    );

  }

  const handleApprove = async()=>{

  try{

    await approve(surat.id);

    alert("Surat berhasil disetujui");


    navigate(`${BASE_PATH}/list`);


  }catch(error){

    console.error(error);

    alert("Gagal Menyetujui Surat");

  }

  };  

  const handleRejectSubmit = async (alasan) => {
    try {
      await reject(surat.id, alasan);

      alert("Surat berhasil ditolak");

      setRejectModalOpen(false);

      navigate('/admin/list-rt');

    } catch(error) {
      console.error(error);
      alert("Gagal Menolak Surat");
    }
  };



  const handleReject = async(notes)=>{

    await reject(
      surat.id,
      notes
    );

    setRejectModalOpen(false);

    navigate(`${BASE_PATH}/list`);

  };



  return (

    <div className="max-w-2xl mx-auto py-16">

      <div className="bg-white rounded-2xl shadow-sm p-8">


        <h2 className="font-medium text-gray-800">
          Detail Permohonan Surat
        </h2>


        <p className="text-xs text-gray-400 mb-6">

          #{surat.letter_number ?? "-"} 
          · Surat warga

        </p>



        <ApprovalStepperRT surat={surat}/>


        <SuratInfoGridRT surat={surat}/>
        <ApprovalHistoryRT
            approvals={surat.approvals}
            suratStatus={surat.status}
        />


 {surat.status === "rt_approved" ? (
  <ApprovalActionBarKasi
    onApprove={handleApprove}
    onReject={() =>
      setRejectModalOpen(true)
    }
    onBack={() =>
      navigate(`${BASE_PATH}/list`)
    }
  />
) : (
  <div className="mt-6">
    <button
      onClick={() => navigate(`${BASE_PATH}/list`)}
      className="border border-green-500 text-green-600 px-4 py-2 rounded-md"
    >
      Kembali
    </button>
  </div>
)}


      </div>



      <RejectReasonModalRT

        open={rejectModalOpen}

        onClose={()=>setRejectModalOpen(false)}

        onSubmit={handleReject}

      />


    </div>

  );

}