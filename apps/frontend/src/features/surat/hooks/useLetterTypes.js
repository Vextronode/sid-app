import { useEffect, useState } from "react";
import { getLetterTypes } from "../api/letterTypeApi";

export function useLetterTypes(){

 const [letterTypes,setLetterTypes]=useState([]);

 useEffect(()=>{
    getLetterTypes()
       .then(setLetterTypes)
 },[])

 return letterTypes;
}