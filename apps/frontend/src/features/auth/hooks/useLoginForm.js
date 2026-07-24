import { useState } from "react";
import { loginSchema } from "../schemas/loginSchema";
import api from "@/lib/api";

export function useLoginForm() {
  const [formData, setFormData] = useState({
    nik: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors = {};

      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];

        if (!formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });

      setErrors(formattedErrors);

      return false;
    }

    setErrors({});

    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "nik" && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleSubmit = async (e, onSuccess) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Ambil CSRF Cookie
      await api.get("/sanctum/csrf-cookie");

      // Login
      await api.post("/api/login", formData);

      // Login berhasil
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        throw err;
      }
    }
  };

  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
  };
}