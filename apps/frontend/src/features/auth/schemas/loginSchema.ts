import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),

  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi')
    .min(8, 'Kata sandi minimal 8 karakter dan mengandung kombinasi huruf & angka')
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Kata sandi harus mengandung minimal satu huruf',
    })
    .refine((val) => /\d/.test(val), {
      message: 'Kata sandi harus mengandung minimal satu angka',
    }),
})
