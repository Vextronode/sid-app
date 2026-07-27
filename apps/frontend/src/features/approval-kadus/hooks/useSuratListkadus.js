/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useMemo,
  useState
} from "react";


import {
  getKadusLetters
} from "../api";


import {
  RELEVANT_STATUSES
} from "../constants/roleConfigkadus";



export function useSuratList({
  initialStatus = ""
} = {}) {



  const [letters, setLetters] = useState([]);

  const [loading, setLoading] = useState(false);



  const [search, setSearch] = useState("");

  const [filterJenis, setFilterJenis] = useState("");

  const [filterStatus, setFilterStatus] =
    useState(initialStatus);







  // ==========================================
  // Ambil surat Kadus
  // ==========================================

  const fetchLetters = async()=>{


    try{


      setLoading(true);



      const response =
          await getKadusLetters();



      setLetters(
        response.data.data ?? []
      );



    }catch(error){


      console.error(
        "GET KADUS LETTER ERROR",
        error.response?.data ?? error
      );



      setLetters([]);



    }finally{


      setLoading(false);


    }


  };







  useEffect(()=>{


    fetchLetters();


  },[]);








  // ==========================================
  // Filter data
  // ==========================================

  const data = useMemo(()=>{


    let result = [
      ...letters
    ];












    // filter jenis surat

    if(filterJenis){


      result =
        result.filter(letter =>
          letter.letter_type?.name
          === filterJenis
        );


    }








    // filter status

    if(filterStatus){


      result =
        result.filter(letter =>
          letter.status
          === filterStatus
        );


    }








    // pencarian nama pemohon

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