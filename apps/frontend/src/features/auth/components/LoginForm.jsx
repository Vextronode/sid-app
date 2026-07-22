import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const { formData, errors, handleChange, handleSubmit } = useLoginForm();

  // navigasi dan logic dari context
  const navigate = useNavigate();
  const { login } = useAuth();

  // "data" di sini sekarang BUKAN formData lagi, tapi data user ASLI
  // hasil GET /api/user (lihat useLoginForm.js) — jadi tidak perlu
  // bikin objek dummy manual seperti sebelumnya.
  const handleLoginSuccess = (data) => {
    login(data);
    navigate("/", { replace: true });
  };

  return (
    <form
      onSubmit={(e) => handleSubmit(e, handleLoginSuccess)}
      className="w-full"
    >
      {/* Pesan error umum (misal "NIK atau password salah"), dikirim
          dari useLoginForm lewat errors.general saat request ke backend gagal */}
      {errors.general && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errors.general}
        </p>
      )}

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
      <Button type="submit">Masuk</Button>
    </form>
  );
}