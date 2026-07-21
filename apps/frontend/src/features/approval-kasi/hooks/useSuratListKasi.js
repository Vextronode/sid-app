// ==========================================
// useSuratListKasi.js
// Mengambil daftar surat Kasi dari backend.
// Mengikuti pola useSuratListRW.
// Kasi hanya memproses surat dengan status:
// kadus_approved -> kasi_approved/kasi_rejected
// ==========================================

import {
  useEffect,
  useMemo,
  useState
} from "react";


import {
  getSuratList
} from "@/features/approval/api";


import {
  RELEVANT_STATUSES
} from "../constants/roleConfigKasi";



// ==========================================
// Hook daftar surat Kasi
// ==========================================
export function useSuratListKasi({
  initialStatus = ""
} = {}) {


  const [
    letters,
    setLetters
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(false);



  const [
    search,
    setSearch
  ] = useState("");



  const [
    filterJenis,
    setFilterJenis
  ] = useState("");



  const [
    filterStatus,
    setFilterStatus
  ] = useState(initialStatus);





  // ==========================================
  // Ambil surat Kasi
  // ==========================================
  const fetchLetters = async()=>{


    try{


      setLoading(true);



      const response =
  await getSuratList("kasi");


console.log(
  "KASI API RESPONSE",
  response.data
);


setLetters(
  response.data.data 
  ?? response.data 
  ?? []
);
console.log(
  "KASI LETTERS SET",
  response.data.data ?? response.data ?? []
);



    }catch(error){


      console.error(
        "GET KASI LETTER ERROR",
        error.response?.data ?? error
      );



      setLetters([]);



    }finally{


      setLoading(false);


    }


  };






  // ==========================================
  // Load awal
  // ==========================================
  useEffect(()=>{


    fetchLetters();


  },[]);







  // ==========================================
  // Filter data surat Kasi
  // ==========================================
const data = useMemo(()=>{

  let result = [
    ...letters
  ];


  console.log(
    "KASI BEFORE FILTER",
    result
  );


  result =
    result.filter(letter =>
      RELEVANT_STATUSES.includes(
        letter.status
      )
    );


  console.log(
    "KASI AFTER STATUS FILTER",
    result
  );


  if(filterJenis){

    result =
      result.filter(letter =>
        letter.letter_type?.name === filterJenis
      );

  }


  if(filterStatus){

    result =
      result.filter(letter =>
        letter.status === filterStatus
      );

  }


  if(search){

    result =
      result.filter(letter =>
        letter.citizen?.name
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
      );

  }


  console.log(
    "KASI FINAL DATA",
    result
  );


  return result;


},[
  letters,
  filterJenis,
  filterStatus,
  search
]);







  return {


    data,


    loading,



    search,
    setSearch,



    filterJenis,
    setFilterJenis,



    filterStatus,
    setFilterStatus,



    refresh:
      fetchLetters


  };


}