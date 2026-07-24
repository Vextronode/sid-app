import { useEffect, useState } from "react";
import { getSuratDetail } from "@/features/approval/api";


export function useSuratDetail(id){

 const [surat,setSurat]=useState(null);
 const [isLoading,setIsLoading]=useState(true);
 const [notFound,setNotFound]=useState(false);



 const fetchDetail = async()=>{

  try{

    setIsLoading(true);


    const response = await getSuratDetail(id,"rt");


    setSurat(response.data.data);
    setNotFound(false);


  }catch(error){


    console.error(
      "DETAIL ERROR",
      error.response?.data ?? error
    );


    if(error.response?.status === 404){
      setNotFound(true);
    }


  }finally{

    setIsLoading(false);

  }

 };



 useEffect(()=>{

   if(id){
     fetchDetail();
   }

 },[id]);



 return {
   surat,
   isLoading,
   notFound,
   refresh:fetchDetail
 };

}