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

  const handleLoginSuccess = (data) => {
    // buat bikin dummy user
    login({
      id: 1,
      name: "Agus Ganteng",
      nik: data.nik,
      alamat: "Jl. Raya Cibenda No. 123, RT 03/RW 05",
      rtrw: "003/005",
      role: "warga",
    });

    navigate("/", { replace: true });
  };

  return (
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
      <Button type="submit">Masuk</Button>
    </form>
  );
}
