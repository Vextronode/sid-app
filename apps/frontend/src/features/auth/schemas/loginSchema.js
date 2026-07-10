import { z } from "zod";

export const loginSchema = z.object({
  nik: z
    .string()
    .min(1, "NIK wajib diisi")
    .length(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya boleh berisi angka"),

  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(
      8,
      "Password minimal 8 karakter dan mengandung kombinasi huruf & angka",
    )
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Password harus mengandung minimal satu huruf",
    })
    .refine((val) => /\d/.test(val), {
      message: "Password harus mengandung minimal satu angka",
    }),
});
