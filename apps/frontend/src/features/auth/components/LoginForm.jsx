import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const { formData, errors, handleChange, handleSubmit } = useLoginForm();

  const navigate = useNavigate();

  const { login } = useAuth();

  const [serverError, setServerError] = useState("");

  const handleLoginSuccess = async () => {
    try {
      setServerError("");

      // Ambil user dari session Laravel
      await login();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(error);

      setServerError(
        error.response?.data?.message ??
        "Login gagal."
      );
    }
  };

  return (
    <>
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form
        onSubmit={(e) => handleSubmit(e, handleLoginSuccess)}
        className="w-full"
      >
        <Input
          label="NIK"
          name="nik"
          type="text"
          maxLength={16}
          placeholder="321xxxxxxxxxxxxx"
          value={formData.nik}
          onChange={handleChange}
          error={errors.nik}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <Button type="submit">
          Masuk
        </Button>
      </form>
    </>
  );
}