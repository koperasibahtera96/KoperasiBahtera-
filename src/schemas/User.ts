import { z } from 'zod';

// Zod schema for registration form validation
export const registrationSchema = z.object({
  fullName: z.string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .regex(/^[a-zA-Z\s\.]+$/, 'Nama hanya boleh berisi huruf, spasi, dan titik'),
  email: z.string()
    .email('Format email tidak valid')
    .max(255, 'Email terlalu panjang'),
  phoneNumber: z.string()
    .regex(/^(\+62|0)[0-9]{9,13}$/, 'Format nomor telepon Indonesia tidak valid (contoh: 08123456789)'),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/(?=.*[a-z])/, 'Password harus mengandung huruf kecil')
    .regex(/(?=.*[A-Z])/, 'Password harus mengandung huruf besar')
    .regex(/(?=.*\d)/, 'Password harus mengandung angka')
    .regex(/(?=.*[@$!%*?&])/, 'Password harus mengandung karakter khusus (@$!%*?&)'),
  confirmPassword: z.string()
    .min(1, 'Konfirmasi password wajib diisi'),
  dateOfBirth: z.string()
    .min(1, 'Tanggal lahir wajib diisi')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 17;
    }, 'Minimal umur 17 tahun'),
  address: z.string()
    .min(10, 'Alamat minimal 10 karakter'),
  village: z.string()
    .min(1, 'Desa/Kelurahan wajib diisi'),
  city: z.string()
    .min(1, 'Kota/Kabupaten wajib diisi'),
  province: z.string()
    .min(1, 'Provinsi wajib diisi'),
  postalCode: z.string()
    .regex(/^[0-9]{5}$/, 'Kode pos harus 5 digit angka'),
  occupation: z.string()
    .min(1, 'Pekerjaan wajib diisi'),
  agreeToTerms: z.boolean()
    .refine((val) => val === true, 'Anda harus menyetujui syarat & ketentuan'),
  agreeToPrivacy: z.boolean()
    .refine((val) => val === true, 'Anda harus menyetujui kebijakan privasi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;