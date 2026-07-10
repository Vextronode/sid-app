import { useLoginForm } from "@/features/auth/hooks/useLoginForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  // call state dan logic dari custom hook
  const { formData, errors, handleChange, handleSubmit } = useLoginForm();

  const handleLoginSuccess = (data) => {
    console.log("Validasi FE Sukses! Data siap kirim ke API:", data);
    // integrasi api ticket code SID-27 tar disini
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
