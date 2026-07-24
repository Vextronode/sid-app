import { useEffect, useMemo, useState } from "react";

import { getSuratList } from "@/features/approval/api";
import { RELEVANT_STATUSES } from "../constants/roleConfigRW";


export function useSuratList({ initialStatus = "" } = {}) {


  const [letters, setLetters] = useState([]);

  const [loading, setLoading] = useState(false);


  const [search, setSearch] = useState("");

  const [filterJenis, setFilterJenis] = useState("");

  const [filterStatus, setFilterStatus] =
    useState(initialStatus);




  const fetchLetters = async()=>{

    try{

      setLoading(true);


      const response =
        await getSuratList("rw");


      setLetters(
        response.data.data ?? []
      );


    }catch(error){


      console.error(
        "GET RW LETTER ERROR",
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





  const data = useMemo(()=>{


    let result = [...letters];



    // status yang boleh tampil di RW
    result =
      result.filter(letter =>
        RELEVANT_STATUSES.includes(
          letter.status
        )
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


    refresh:fetchLetters


  };


}