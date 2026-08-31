import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const navigate = useNavigate();

  const { formData, errors, handleChange, handleSubmit } = useLoginForm();
  const { login } = useAuth();

  const [serverError, setServerError] = useState("");

  const handleLoginSuccess = async () => {
    try {
      setServerError("");

      // Mengambil data user yang berhasil login
      // agar dapat menentukan halaman tujuan sesuai role.
      const user = await login();

      // Redirect otomatis berdasarkan role user.
      switch (user.role) {
        case "rt":
          navigate("/admin/dashboard-surat-rt", { replace: true });
          break;

        case "rw":
          navigate("/admin/dashboard-surat-rw", { replace: true });
          break;

        case "kadus":
          navigate("/admin/dashboard-surat-kadus", { replace: true });
          break;

        case "petugas_desa":
          navigate("/admin/dashboard-surat-petugas-desa", {
            replace: true,
          });
          break;

        case "kepala_desa":
          navigate("/admin/dashboard-surat-kades", {
            replace: true,
          });
          break;

        case "kasi":
          navigate("/admin/dashboard-surat-kasi", {
            replace: true,
          });
          break;

        // Role admin lainnya sementara diarahkan ke beranda
        // sampai dashboard masing-masing tersedia.
        case "sekretaris_desa":
        case "kasi_pelayanan":
        case "kaur_tu_umum":
        case "warga":
        default:
          navigate("/", { replace: true });
      }
    } catch (error) {
      console.error(error);

      setServerError(
        error.response?.data?.message ??
          "Login gagal."
      );
    }
  };

  return (
    <div className="sid-login-form">
      {serverError && (
        <div className="sid-login-form-error">
          {serverError}
        </div>
      )}

      <form
        onSubmit={(e) => handleSubmit(e, handleLoginSuccess)}
        className="sid-login-form-content"
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
    </div>
  );
}