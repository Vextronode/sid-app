import api from "@/lib/api";

export const submitSurat = async (formData) => {
    const response = await api.post("/api/letters", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};