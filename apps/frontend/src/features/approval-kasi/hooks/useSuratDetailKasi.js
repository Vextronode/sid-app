// ==========================================
// useSuratDetailKasi.js
// Mengambil detail surat Kasi dari backend.
// Mengikuti pola useSuratDetailRW.
// Kasi sebagai approval final surat.
// ==========================================

import {
  useEffect,
  useState
} from "react";


import {
  getSuratDetail
} from "@/features/approval/api";





export function useSuratDetailKasi(id) {


  const [
    surat,
    setSurat
  ] = useState(null);



  const [
    isLoading,
    setIsLoading
  ] = useState(true);



  const [
    notFound,
    setNotFound
  ] = useState(false);







  // ===============================
  // Fetch detail surat Kasi
  // ===============================
  const fetchDetail = async()=>{


    try{


      setIsLoading(true);



      const response =
        await getSuratDetail(
          id,
          "kasi"
        );



      setSurat(
        response.data.data
      );



      setNotFound(false);



    }catch(error){



      console.error(
        "DETAIL KASI ERROR",
        error.response?.data ?? error
      );



      if(error.response?.status === 404){


        setNotFound(true);


      }



    }finally{


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



    refresh:
      fetchDetail


  };


}