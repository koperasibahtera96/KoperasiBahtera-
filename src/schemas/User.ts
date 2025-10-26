import { z } from 'zod';

// Zod schema for registration form validation
export const registrationSchema = z.object({
  fullName: z.string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .regex(/^[a-zA-Z\s\.]+$/, 'Nama hanya boleh berisi huruf, spasi, dan titik'),
  nik: z.string()
    .regex(/^[0-9]{16}$/, 'NIK harus berisi 16 digit angka'),
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
    .min(1, 'Tanggal lahir wajib diisi'),
  // KTP Address
  ktpAddress: z.string()
    .min(1, 'Alamat KTP wajib diisi'),
  ktpVillage: z.string()
    .min(1, 'Desa/Kelurahan KTP wajib diisi'),
  ktpKecamatan: z.string()
    .min(1, 'Kecamatan KTP wajib diisi'),
  ktpCity: z.string()
    .min(1, 'Kota/Kabupaten KTP wajib diisi'),
  ktpProvince: z.string()
    .min(1, 'Provinsi KTP wajib diisi'),
  ktpPostalCode: z.string()
    .regex(/^[0-9]{5}$/, 'Kode pos KTP harus 5 digit angka'),
  // Domisili Address
  domisiliAddress: z.string()
    .min(1, 'Alamat domisili wajib diisi'),
  domisiliVillage: z.string()
    .min(1, 'Desa/Kelurahan domisili wajib diisi'),
  domisiliKecamatan: z.string()
    .min(1, 'Kecamatan domisili wajib diisi'),
  domisiliCity: z.string()
    .min(1, 'Kota/Kabupaten domisili wajib diisi'),
  domisiliProvince: z.string()
    .min(1, 'Provinsi domisili wajib diisi'),
  domisiliPostalCode: z.string()
    .regex(/^[0-9]{5}$/, 'Kode pos domisili harus 5 digit angka'),
  occupation: z.string()
    .min(1, 'Pekerjaan wajib diisi'),
  // Beneficiary Information (Penerima Manfaat)
  beneficiaryName: z.string()
    .min(2, 'Nama penerima manfaat minimal 2 karakter')
    .max(100, 'Nama penerima manfaat maksimal 100 karakter')
    .regex(/^[a-zA-Z\s\.]+$/, 'Nama hanya boleh berisi huruf, spasi, dan titik'),
  beneficiaryNik: z.string()
    .regex(/^[0-9]{16}$/, 'NIK penerima manfaat harus berisi 16 digit angka'),
  beneficiaryDateOfBirth: z.string()
    .min(1, 'Tanggal lahir penerima manfaat wajib diisi'),
  beneficiaryRelationship: z.enum(['orangtua', 'suami_istri', 'anak_kandung', 'saudara_kandung'])
    .refine((val) => val !== undefined, {
      message: 'Hubungan dengan penerima manfaat wajib diisi',
    }),
  agreeToTerms: z.boolean()
    .refine((val) => val === true, 'Anda harus menyetujui syarat & ketentuan'),
  agreeToPrivacy: z.boolean()
    .refine((val) => val === true, 'Anda harus menyetujui kebijakan privasi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;