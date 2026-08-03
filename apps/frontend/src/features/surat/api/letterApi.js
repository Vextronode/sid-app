import api from "@/lib/api";


export const getMyLetters = async () => {
    const response = await api.get("/api/letters");

console.dir(response.data.data[0]);
    return response.data.data;
};