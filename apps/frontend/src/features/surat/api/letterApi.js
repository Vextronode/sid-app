import api from "@/lib/api";


export const getMyLetters = async () => {
    const response = await api.get("/api/letters");

    return response.data.data;
};