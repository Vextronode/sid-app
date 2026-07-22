/* eslint-disable no-unused-vars */
import { useState } from "react";
import { loginSchema } from "../schemas/loginSchema";
import api from "@/lib/api";

export function useLoginForm() {
  const [formData, setFormData] = useState({ nik: "", password: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    // prsing data dari zod
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors = {};

      // map error dari Zod ke state error
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

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e, onSuccess) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // 1. Ambil CSRF cookie dulu (wajib untuk Sanctum SPA auth)
      await api.get("/sanctum/csrf-cookie");

      // 2. Login — respons ini KOSONG kalau sukses (204 No Content),
      //    jangan ambil apapun dari response.data di sini.
      await api.post("/login", {
        nik: formData.nik,
        password: formData.password,
      });

      // 3. Baru di sini kita ambil data user asli yang sudah login
      const { data: user } = await api.get("/api/user");

      onSuccess(user);
    } catch (error) {
      console.error("Login gagal:", error);
      setErrors({
        general:
          error.response?.data?.errors?.nik?.[0] ||
          error.response?.data?.message ||
          "NIK atau password salah",
      });
    }
  };
  
  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
  };
}
