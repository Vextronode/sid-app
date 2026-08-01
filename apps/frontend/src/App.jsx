/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/contexts/AuthContext";

import LoginPage from "@/pages/LoginPage";
import { BerandaPage } from "@/pages/BerandaPage";
import { DetailBeritaPage } from "@/pages/DetailBeritaPage";
import { BeritaPage } from "@/pages/BeritaPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProfilDesaPage } from "@/pages/ProfilDesaPage";
import { PengajuanSuratPage } from "@/pages/PengajuanSuratPage";
import { DaftarSurat } from "@/pages/DaftarSurat";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import JenisSuratPage from "@/pages/JenisSuratPage";
import ProfilePage from "@/pages/ProfilePage";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { OperatorDesaLayout } from "@/components/layout/OperatorDesaLayout";
import RiwayatSuratPage from "@/pages/RiwayatSuratPage";

// RT & RW — approver (RT tahap 1, RW tahap final)
import RTDashboardPage from "@/pages/admin/RTDashboardPage";
import RTListPage from "@/pages/admin/RTListPage";
import RWDashboardPage from "@/pages/admin/RWDashboardPage";
import RWListPage from "@/pages/admin/RWListPage";
import AdminProfilePage from "@/pages/admin/AdminProfilePage";

// Kadus — monitoring saja
import KadusDashboardPage from "@/pages/admin/KadusDashboardPage";
import KadusListPage from "@/pages/admin/KadusListPage";

// Kades — monitoring saja
import KadesDashboardPage from "@/pages/admin/KadesDashboardPage";
import KadesListPage from "@/pages/admin/KadesListPage";

// Operator Desa — Kasi Pelayanan, Kaur TU Umum, Petugas Desa
// (1 role gabungan, 1 tampilan yang sama, cuma print surat rw_approved)
import OperatorDesaDashboardPage from "@/pages/admin/OperatorDesaDashboardPage";
import DataWargaPage from "@/pages/admin/DataWargaPage";
import ManajemenUserPage from "@/pages/admin/ManajemenUserPage";
import KelolaBeritaPage from "@/pages/admin/KelolaBeritaPage";
import KelolaProfilDesaPage from "@/pages/admin/KelolaProfilDesaPage";
import OperatorSuratListPage from "@/pages/admin/OperatorSuratListPage";

// Role yang termasuk "Operator Desa" (dipakai berulang di bawah)
const OPERATOR_DESA_ROLES = ["kasi_pelayanan", "kaur_tu_umum", "petugas_desa"];

// Route khusus untuk user yang belum login.
// Jika user sudah login, arahkan ke halaman sesuai role.
const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (user) {
    switch (user.role) {
      case "rt":
        return <Navigate to="/admin/dashboard-surat-rt" replace />;
      case "rw":
        return <Navigate to="/admin/dashboard-surat-rw" replace />;
      case "kadus":
        return <Navigate to="/admin/dashboard-surat-kadus" replace />;
      case "kepala_desa":
        return <Navigate to="/admin/dashboard-surat-kades" replace />;
      case "kasi_pelayanan":
      case "kaur_tu_umum":
      case "petugas_desa":
        return <Navigate to="/admin/operator-desa" replace />;
      case "warga":
        return <Navigate to="/daftar-surat" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

// Route yang hanya bisa diakses oleh user yang sudah login.
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ===== HALAMAN PUBLIK ===== */}
          <Route path="/" element={<MainLayout><BerandaPage /></MainLayout>} />
          <Route path="/berita" element={<MainLayout><BeritaPage /></MainLayout>} />
          <Route path="/berita/:id" element={<MainLayout><DetailBeritaPage /></MainLayout>} />
          <Route path="/profil-desa" element={<MainLayout><ProfilDesaPage /></MainLayout>} />
        
          {/* ===== WARGA ===== */}
          <Route
            path="/daftar-surat"
            element={
              <ProtectedRoute allowedRoles={["warga"]}>
                <DaftarSurat />
              </ProtectedRoute>
            }
          />

          <Route
  path="/jenis-surat"
  element={
    <ProtectedRoute allowedRoles={["warga"]}>
      <JenisSuratPage />
    </ProtectedRoute>
  }
/>

          <Route
  path="/pengajuan-surat"
  element={
    <ProtectedRoute allowedRoles={["warga"]}>
      <PengajuanSuratPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/pengajuan-surat/:kode"
  element={
    <ProtectedRoute allowedRoles={["warga"]}>
      <PengajuanSuratPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/riwayat-surat"
  element={
    <ProtectedRoute allowedRoles={["warga"]}>
      <RiwayatSuratPage />
    </ProtectedRoute>
  }
/>

          {/* ===== RT — approve tahap 1 ===== */}
          <Route
            path="/admin/dashboard-surat-rt"
            element={
              <ProtectedRoute allowedRoles={["rt"]}>
                <AdminLayout><RTDashboardPage /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-rt"
            element={
              <ProtectedRoute allowedRoles={["rt"]}>
                <AdminLayout><RTListPage /></AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
  path="/admin/profile"
  element={
    <ProtectedRoute allowedRoles={["rt", "rw"]}>
      <AdminLayout>
        <AdminProfilePage />
      </AdminLayout>
    </ProtectedRoute>
  }
/>

          {/* ===== RW — approve tahap final ===== */}
          <Route
            path="/admin/dashboard-surat-rw"
            element={
              <ProtectedRoute allowedRoles={["rw"]}>
                <AdminLayout><RWDashboardPage /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-rw"
            element={
              <ProtectedRoute allowedRoles={["rw"]}>
                <AdminLayout><RWListPage /></AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== Kadus — monitoring saja ===== */}
          <Route
            path="/admin/dashboard-surat-kadus"
            element={
              <ProtectedRoute allowedRoles={["kadus"]}>
                <AdminLayout><KadusDashboardPage /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-kadus"
            element={
              <ProtectedRoute allowedRoles={["kadus"]}>
                <AdminLayout><KadusListPage /></AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== Kepala Desa — monitoring saja ===== */}
          <Route
            path="/admin/dashboard-surat-kades"
            element={
              <ProtectedRoute allowedRoles={["kepala_desa"]}>
                <AdminLayout><KadesDashboardPage /></AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-kades"
            element={
              <ProtectedRoute allowedRoles={["kepala_desa"]}>
                <AdminLayout><KadesListPage /></AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== OPERATOR DESA — Kasi Pelayanan, Kaur TU Umum, Petugas Desa =====
              1 role gabungan, 1 tampilan yang sama untuk ketiganya.
              Hanya bisa print surat yang sudah rw_approved. */}
          <Route
            path="/admin/operator-desa"
            element={
              <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
                <OperatorDesaLayout><OperatorDesaDashboardPage /></OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data-warga"
            element={
              <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
                <OperatorDesaLayout><DataWargaPage /></OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manajemen-user"
            element={
              <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
                <OperatorDesaLayout><ManajemenUserPage /></OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kelola-berita"
            element={
              <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
                <OperatorDesaLayout><KelolaBeritaPage /></OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kelola-profil-desa"
            element={
              <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
                <OperatorDesaLayout><KelolaProfilDesaPage /></OperatorDesaLayout>
              </ProtectedRoute>
            }
          />

          <Route
  path="/admin/operator-desa/surat"
  element={
    <ProtectedRoute allowedRoles={OPERATOR_DESA_ROLES}>
      <OperatorDesaLayout><OperatorSuratListPage /></OperatorDesaLayout>
    </ProtectedRoute>
  }
/>

<Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/lupa-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

        <Route
  path="/profile"
  element={
    <ProtectedRoute allowedRoles={["warga"]}>
      <ProfilePage />
    </ProtectedRoute>
  }
/>

          {/* ===== LOGIN ===== */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}