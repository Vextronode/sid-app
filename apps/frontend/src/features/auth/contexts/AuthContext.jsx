/* eslint-disable no-unused-vars */
// ==========================================
// AuthContext.jsx
// 🔧 SEMENTARA — dummy mode. Backend/database lagi bermasalah (connection
// timeout terus-terusan), jadi checkSession() DI-SKIP total, user langsung
// diisi data dummy dari awal. TIDAK ADA request API sama sekali di sini.
//
// Ganti `role: 'rt'` di bawah ke role lain buat testing tampilan role
// berbeda: 'rt' | 'rw' | 'kadus' | 'kepala_desa' | 'kasi_pelayanan' |
// 'kaur_tu_umum' | 'petugas_desa' | 'warga'
//
// ⚠️ Begitu backend/database beres, KEMBALIKAN file ini ke versi asli
// (yang manggil api.get("/api/user")) — jangan lupa!
// ==========================================

import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

// 🔧 Ganti role di sini buat lihat tampilan role lain
const DUMMY_USER = {
  id: 1,
  name: 'Budi Santoso',
  email: 'rt@example.com',
  nik: '3201010101010008',
  role: 'rw',
  wilayah_kode: '001',
  wilayah_label: 'RT 001, RW001 - Desa Cibenda',
  address: 'Kp. Cibenda RT 001/RW 001',
  gender: 'L',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DUMMY_USER); // langsung terisi, tanpa fetch
  const [isLoading, setIsLoading] = useState(false); // langsung false, tanpa nunggu

  const checkSession = async () => {
    // Dikosongkan sementara — nggak ada request API sama sekali
  };

  const login = async () => {
    // Dikosongkan sementara — anggap selalu berhasil pakai user dummy
    setUser(DUMMY_USER);
    return DUMMY_USER;
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        checkSession,
        setUser, // ditambahkan, dipakai di ProfilePage.jsx buat update dummy
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);