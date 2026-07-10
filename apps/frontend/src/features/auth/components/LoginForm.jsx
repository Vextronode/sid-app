import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [formData, setFormData] = useState({ nik: "", password: "" });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.nik) {
      newErrors.nik = "NIK wajib diisi";
    } else if (!/^\d+$/.test(formData.nik)) {
      newErrors.nik = "NIK hanya boleh berisi angka";
    } else if (formData.nik.length !== 16) {
      newErrors.nik = "NIK harus 16 digit";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "nik" && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log("Validasi FE Sukses! Data siap kirim ke API:", formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
