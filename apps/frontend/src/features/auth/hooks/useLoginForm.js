import { useState } from "react";
import { loginSchema } from "../schemas/loginSchema";
import api from "@/lib/api";

export function useLoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // VALIDASI FORM
  // ==========================================

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

  // ==========================================
  // HANDLE CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Hapus error field ketika user mulai mengetik lagi
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================

  const handleSubmit = async (e, onSuccess) => {
    e.preventDefault();

    // ==========================================
    // VALIDASI FRONTEND
    // ==========================================

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});

      // ==========================================
      // CSRF COOKIE
      // Laravel Sanctum
      // ==========================================

      await api.get("/sanctum/csrf-cookie");

      // ==========================================
      // LOGIN
      // ==========================================

      const response = await api.post("/login", {
        username: formData.username,
        password: formData.password,
      });

      // ==========================================
      // AMBIL USER DARI RESPONSE BE
      //
      // BE:
      // {
      //   message: "Login berhasil",
      //   user: {...}
      // }
      // ==========================================

      const loggedUser =
        response.data?.user ?? response.data;

      // ==========================================
      // SUCCESS
      // ==========================================

      if (onSuccess) {
        onSuccess(loggedUser);
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      // ==========================================
      // VALIDATION ERROR 422
      // ==========================================

      if (err.response?.status === 422) {
        const backendErrors =
          err.response.data?.errors ?? {};

        setErrors(backendErrors);

        return;
      }

      // ==========================================
      // ERROR LAIN
      // ==========================================

      setErrors({
        general:
          err.response?.data?.message ??
          "Username atau password salah.",
      });
    } finally {
      // ==========================================
      // SELESAI LOADING
      // ==========================================

      setIsLoading(false);
    }
  };

  // ==========================================
  // RETURN
  // ==========================================

  return {
    formData,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  };
}