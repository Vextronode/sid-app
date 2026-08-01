import { useEffect, useState } from "react";
import api from "@/lib/api";

export function useLetterTypes() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get("/api/letter-types");


        setData(res.data.data ?? res.data);
      } catch (err) {
        console.error("LETTER TYPES ERROR", err);
      }
    };

    fetchTypes();
  }, []);
  return { data };
}