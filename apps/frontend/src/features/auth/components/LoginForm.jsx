import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const navigate = useNavigate();

  const {
    formData,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  } = useLoginForm();

  const { login } = useAuth();

  // ==========================================
  // LOGIN SUCCESS
  // ==========================================

  const handleLoginSuccess = async (loggedUser) => {
    try {
      // Simpan user hasil login ke AuthContext.
      const user = await login(loggedUser);

      if (!user?.role) {
        console.error("USER ROLE TIDAK DITEMUKAN:", user);

        return;
      }

      // ==========================================
      // REDIRECT BERDASARKAN ROLE
      // ==========================================

      switch (user.role) {
        case "rt":
          navigate("/admin/dashboard-surat-rt", {
            replace: true,
          });
          break;

        case "rw":
          navigate("/admin/dashboard-surat-rw", {
            replace: true,
          });
          break;

        case "kadus":
          navigate("/admin/dashboard-surat-kadus", {
            replace: true,
          });
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
        case "kasi_pelayanan":
          navigate("/admin/dashboard-surat-kasi", {
            replace: true,
          });
          break;

        case "kaur_tu_umum":
          navigate("/admin/dashboard-surat-kaur", {
            replace: true,
          });
          break;

        case "sekretaris_desa":
          navigate("/", {
            replace: true,
          });
          break;

        case "warga":
          navigate("/daftar-surat", {
            replace: true,
          });
          break;

        default:
          console.warn(
            "ROLE BELUM MEMILIKI REDIRECT:",
            user.role,
          );

          navigate("/", {
            replace: true,
          });
      }
    } catch (error) {
      console.error("LOGIN SUCCESS ERROR:", error);
    }
  };

  return (
    <div className="sid-login-form">
      {/* ==========================================
          GENERAL ERROR
          ========================================== */}

      {errors.general && (
        <div className="sid-login-form-error">
          {errors.general}
        </div>
      )}

      {/* ==========================================
          FORM
          ========================================== */}

      <form
        onSubmit={(e) =>
          handleSubmit(e, handleLoginSuccess)
        }
        className="sid-login-form-content"
      >
        {/* ==========================================
            USERNAME
            ========================================== */}

        <Input
          label="Username"
          name="username"
          type="text"
          placeholder="Masukkan username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
          autoComplete="username"
        />

        {/* ==========================================
            PASSWORD
            ========================================== */}

        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        {/* ==========================================
            SUBMIT
            ========================================== */}

        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Memproses..." : "Masuk"}
        </Button>
      </form>
    </div>
  );
}

