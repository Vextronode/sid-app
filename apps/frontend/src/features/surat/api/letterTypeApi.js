import api from "@/lib/api";

export const getLetterTypes = async () => {
    const response = await api.get("/api/letter-types");

    return response.data.data;
};