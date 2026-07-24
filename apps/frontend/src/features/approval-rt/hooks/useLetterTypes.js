import { useEffect, useState } from "react";
import api from "@/lib/api";

export function useLetterTypes() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get("/api/letter-types");

        console.log("LETTER TYPES RESPONSE", res.data);

        setData(res.data.data ?? res.data);
      } catch (err) {
        console.error("LETTER TYPES ERROR", err);
      }
    };

    fetchTypes();
  }, []);
  console.log("BASE URL:", api.defaults.baseURL);
  return { data };
}