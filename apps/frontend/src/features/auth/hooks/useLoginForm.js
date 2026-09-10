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
  // VALIDATION
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

    setErrors((prev) => ({
      ...prev,
      [name]: null,
      general: null,
    }));
  };

  // ==========================================
  // HANDLE SUBMIT
  // ==========================================

  const handleSubmit = async (e, onSuccess) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    // ==========================================
    // 1. VALIDATE FORM
    // ==========================================

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});


      // ==========================================
      // 2. CSRF COOKIE
      // ==========================================



      await api.get("/sanctum/csrf-cookie");

  
      // ==========================================
      // 3. LOGIN
      // ==========================================

      const loginUrl =
        `${api.defaults.baseURL}/api/login`;

      console.log("REQUEST LOGIN:", loginUrl);

      const response = await api.post(
        "/api/login",
        {
          username: formData.username,
          password: formData.password,
        },
        {
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        },
      );

      // ==========================================
      // LOGIN RESPONSE
      // ==========================================

      // ==========================================
      // 4. AMBIL USER
      // ==========================================

      const loggedUser = response.data?.user;

      // ==========================================
      // 5. VALIDASI RESPONSE LOGIN
      // ==========================================

      if (
        !loggedUser ||
        typeof loggedUser !== "object" ||
        !loggedUser.role
      ) {
        console.error(
          "INVALID LOGIN RESPONSE:",
          response.data,
        );

        setErrors({
          general: "Username atau password salah.",
        });

        return;
      }

      // ==========================================
      // 6. LOGIN BERHASIL
      // ==========================================


      if (onSuccess) {
        await onSuccess(loggedUser);
      }
    }
     catch (err) {
      // ==========================================
      // LOGIN ERROR
      // ==========================================

      console.error("=================================");
      console.error("LOGIN ERROR:", err);
      console.error(
        "LOGIN STATUS:",
        err.response?.status,
      );
      console.error(
        "LOGIN RESPONSE:",
        err.response?.data,
      );
      console.error(
        "LOGIN URL:",
        err.config?.url,
      );
      console.error(
        "LOGIN BASE URL:",
        err.config?.baseURL,
      );
      console.error("=================================");

      // ==========================================
      // 422 VALIDATION / CREDENTIAL ERROR
      // ==========================================

      if (err.response?.status === 422) {
        const backendErrors =
          err.response.data?.errors ?? {};

        const usernameError =
          backendErrors.username?.[0];

        const passwordError =
          backendErrors.password?.[0];

        // ------------------------------------------
        // USERNAME SALAH
        // ------------------------------------------

        if (usernameError) {
          setErrors({
            username: "Username tidak ditemukan.",
            password: null,
            general: null,
          });

          return;
        }

        // ------------------------------------------
        // PASSWORD SALAH
        // ------------------------------------------

        if (passwordError) {
          setErrors({
            username: null,
            password: "Password salah.",
            general: null,
          });

          return;
        }

        // ------------------------------------------
        // ERROR VALIDASI LAIN
        // ------------------------------------------

        setErrors({
          username: null,
          password: null,
          general:
            err.response.data?.message ??
            "Username atau password salah.",
        });

        return;
      }

      // ==========================================
      // 401 UNAUTHORIZED
      // ==========================================

      if (err.response?.status === 401) {
        setErrors({
          username: null,
          password: "Password salah.",
          general: null,
        });

        return;
      }

      // ==========================================
      // 403 ACCOUNT BLOCKED
      // ==========================================

      if (err.response?.status === 403) {
        setErrors({
          username: null,
          password: null,
          general:
            err.response.data?.message ??
            "Akun Anda telah diblokir.",
        });

        return;
      }

      // ==========================================
      // 404 NOT FOUND
      // ==========================================

      if (err.response?.status === 404) {
        setErrors({
          username: null,
          password: null,
          general:
            "Endpoint login tidak ditemukan. Periksa konfigurasi API atau Nginx.",
        });

        return;
      }

      // ==========================================
      // ERROR LAIN
      // ==========================================

      setErrors({
        username: null,
        password: null,
        general:
          err.response?.data?.message ??
          "Terjadi kesalahan saat login.",
      });


    } finally {
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