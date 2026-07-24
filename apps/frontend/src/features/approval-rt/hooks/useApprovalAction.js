import { useState } from "react";
import { submitDecision } from "@/features/approval/api";


export function useApprovalAction(){

 const [isSubmitting,setIsSubmitting]=useState(false);



 const approve = async(id)=>{

  try{

    setIsSubmitting(true);

    await submitDecision(
      "rt",
      id,
      "approved"
    );


    return true;


  }catch(error){

    console.error(
      "APPROVE ERROR",
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


    await submitDecision(
      "rt",
      id,
      "rejected",
      notes
    );


    return true;


  }catch(error){

    console.error(
      "REJECT ERROR",
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