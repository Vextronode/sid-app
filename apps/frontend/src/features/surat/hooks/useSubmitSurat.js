import { useState } from "react";
import { submitSurat } from "../api/suratApi";

export function useSubmitSurat() {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState("");

    const handleSubmit = async (formData) => {
        try {
            setLoading(true);
            setErrors({});
            setSuccess("");

            const data = await submitSurat(formData);

            setSuccess(data.message);

            return data;
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                alert("Gagal mengirim surat.");
            }

            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        errors,
        success,
        handleSubmit,
    };
}