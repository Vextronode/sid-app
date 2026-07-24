import { useState } from "react";
import { approveSurat } from "@/features/approval/api";


export function useApprovalAction(){

 const [isSubmitting,setIsSubmitting] = useState(false);


 const approve = async(id)=>{

  try{

    setIsSubmitting(true);


    await approveSurat(
      "rw",
      id,
      "approved"
    );


    return true;


  }catch(error){

    console.error(
      "RW APPROVE ERROR",
      error.response?.data ?? error
    );


    throw error;


  }finally{

    setIsSubmitting(false);

  }

 };



 const reject = async(id,notes)=>{

  try{

    setIsSubmitting(true);


    await approveSurat(
      "rw",
      id,
      "rejected",
      notes
    );


    return true;


  }catch(error){

    console.error(
      "RW REJECT ERROR",
      error.response?.data ?? error
    );


    throw error;


  }finally{

    setIsSubmitting(false);

  }

 };



 return {
   approve,
   reject,
   isSubmitting
 };

}