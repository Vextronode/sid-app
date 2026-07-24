// ==========================================
// useSuratDetailKadus.js
// Mengambil detail surat Kadus dari backend.
// Mengikuti pola useSuratDetailRW.
// ==========================================

import { useEffect, useState } from "react";
import { getSuratDetail } from "@/features/approval/api";


export function useSuratDetailKadus(id) {

  const [surat, setSurat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);



  // ===============================
  // Fetch detail surat
  // ===============================
  const fetchDetail = async () => {

    try {

      setIsLoading(true);


      const response = await getSuratDetail(
        id,
        "kadus"
      );

      setSurat(
        response.data.data
      );


      setNotFound(false);


    } catch(error) {


      console.error(
        "DETAIL KADUS ERROR",
        error.response?.data ?? error
      );


      if(error.response?.status === 404){

        setNotFound(true);

      }


    } finally {

      setIsLoading(false);

    }

  };




  // ===============================
  // Load ketika id berubah
  // ===============================
  useEffect(()=>{


    if(id){

      fetchDetail();

    }


  },[id]);




  return {

    surat,

    isLoading,

    notFound,

    refresh: fetchDetail

  };

}