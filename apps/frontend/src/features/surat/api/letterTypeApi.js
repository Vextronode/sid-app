import api from "@/lib/api";

export const getLetterTypes = async () => {
    const response = await api.get("/api/letter-types");

    console.log(response.data);

    return response.data;
};