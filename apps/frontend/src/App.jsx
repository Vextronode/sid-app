/* eslint-disable no-unused-vars */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/contexts/AuthContext";

import LoginPage from "@/pages/LoginPage";
import { BerandaPage } from "@/pages/BerandaPage";
import { DetailBeritaPage } from "@/pages/DetailBeritaPage";
import { BeritaPage } from "@/pages/BeritaPage";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProfilDesaPage } from "@/pages/ProfilDesaPage";
import { InfoSuratPage } from "@/pages/InfoSuratPage";
import { PengajuanSuratPage } from "@/pages/PengajuanSuratPage";
import { DaftarSurat } from "@/pages/DaftarSurat";


import { AdminLayout } from "@/components/layout/AdminLayout";
import RTDashboardPage from "@/pages/admin/RTDashboardPage";
import RTListPage from "@/pages/admin/RTListPage";
import RTDetailPage from "@/pages/admin/RTDetailPage";
import RWDashboardPage from "@/pages/admin/RWDashboardPage";
import RWListPage from "@/pages/admin/RWListPage";
import RWDetailPage from "@/pages/admin/RWDetailPage";
import KadusDashboardPage from "@/pages/admin/KadusDashboardPage";
import KadusListPage from "@/pages/admin/KadusListPage";
import KadusDetailPage from "@/pages/admin/KadusDetailPage";
import KasiDashboardPage from "@/pages/admin/KasiDashboardPage";
import KasiListPage from "@/pages/admin/KasiListPage";
import KasiDetailPage from "@/pages/admin/KasiDetailPage";
import PetugasDesaDashboardPage from "@/pages/admin/PetugasDesaDashboardPage";
import PetugasDesaListPage from "@/pages/admin/PetugasDesaListPage";
import PetugasDesaDetailPage from "@/pages/admin/PetugasDesaDetailPage";
import { PETUGAS_DESA_MENU } from '@/features/approval-petugas-desa/constants/navMenu';
import DataWargaPage from "@/pages/admin/DataWargaPage";
import ManajemenUserPage from "@/pages/admin/ManajemenUserPage";
import KelolaBeritaPage from "@/pages/admin/KelolaBeritaPage";
import KelolaProfilDesaPage from "@/pages/admin/KelolaProfilDesaPage";
import KadesDashboardPage from "@/pages/admin/KadesDashboardPage";
import KadesListPage from "@/pages/admin/KadesListPage";

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
        
      case "kasi":
        return <Navigate to="/admin/dashboard-surat-kasi" replace />;

      case "petugas_desa":
        return <Navigate to="/admin/dashboard-surat-petugas-desa" replace />;

      case "kepala_desa":
        return <Navigate to="/admin/dashboard-surat-kades" replace />;

      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

// Route yang hanya bisa diakses oleh user yang sudah login.
// Jika diberikan allowedRoles, maka hanya role tersebut
// yang dapat mengakses halaman.
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika halaman memiliki pembatasan role
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <MainLayout>
                <BerandaPage />
              </MainLayout>
            }
          />

          <Route
            path="/berita"
            element={
              <MainLayout>
                <BeritaPage />
              </MainLayout>
            }
          />

          <Route
            path="/berita/:id"
            element={
              <MainLayout>
                <DetailBeritaPage />
              </MainLayout>
            }
          />

          <Route
            path="/profil-desa"
            element={
              <MainLayout>
                <ProfilDesaPage />
              </MainLayout>
            }
          />

          <Route
            path="/info-surat"
            element={
              <MainLayout>
                <InfoSuratPage />
              </MainLayout>
            }
          />

          <Route
            path="/daftar-surat"
            element={
              <ProtectedRoute allowedRoles={["warga"]}>
                <MainLayout>
                  <DaftarSurat />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pengajuan-surat/:kode"
            element={
              <ProtectedRoute allowedRoles={["warga"]}>
                <MainLayout>
                  <PengajuanSuratPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="admin/dashboard-surat-rt" 
            element={
              <ProtectedRoute allowedRoles={["rt"]}>
                  <AdminLayout>
                  <RTDashboardPage />
                  </AdminLayout>  
              </ProtectedRoute>
              }
            />

          <Route 
            path="/admin/dashboard-surat-rt/list" 
            element= {
              <ProtectedRoute allowedRoles={["rt"]}>
                
                  <AdminLayout>
                  <RTListPage /> 
                  </AdminLayout>
                  
                  </ProtectedRoute>} />

          <Route 
            path="admin/dashboard-surat-rt/detail-permohonan/:id" 
            element={
              <ProtectedRoute allowedRoles={["rt"]}>
                 <AdminLayout>
                 <RTDetailPage />
                </AdminLayout>
              </ProtectedRoute>} />
       

          <Route 
            path="admin/dashboard-surat-rw" 
            element={
              <ProtectedRoute allowedRoles={["rw"]}>
                <AdminLayout>
                 <RWDashboardPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="/admin/dashboard-surat-rw/list" 
            element={
              <ProtectedRoute allowedRoles={["rw"]}>
                <AdminLayout>
                  <RWListPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="admin/dashboard-surat-rw/detail-permohonan/:id" 
            element={
                <ProtectedRoute allowedRoles={["rw"]}> 
                  <AdminLayout>
                    <RWDetailPage />
                    </AdminLayout>
                  </ProtectedRoute>} />


          <Route 
          path="admin/dashboard-surat-kadus" 
          element={
            <ProtectedRoute allowedRoles={["kadus"]}>
              <AdminLayout>
                <KadusDashboardPage />
              </AdminLayout>
            </ProtectedRoute>} />

          <Route 
          path="/admin/dashboard-surat-kadus/list" 
          element={
          <ProtectedRoute allowedRoles={["kadus"]}>
            <AdminLayout>
              <KadusListPage />
            </AdminLayout>
              </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-kadus/detail-permohonan/:id" 
          element={
          <ProtectedRoute allowedRoles={["kadus"]}>
             <AdminLayout>
              <KadusDetailPage />
            </AdminLayout>
          </ProtectedRoute>} />
            
            <Route 
          path="admin/dashboard-surat-kasi" 
          element={
            <ProtectedRoute allowedRoles={["kasi_pelayanan"]}>
              <AdminLayout>
                <KasiDashboardPage />
              </AdminLayout>
            </ProtectedRoute>} />

          <Route 
          path="/admin/dashboard-surat-kasi/list" 
          element={
          <ProtectedRoute allowedRoles={["kasi_pelayanan"]}>
            <AdminLayout>
              <KasiListPage />
            </AdminLayout>
              </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-kasi/detail-permohonan/:id" 
          element={
          <ProtectedRoute allowedRoles={["kasi_pelayanan"]}>
             <AdminLayout>
              <KasiDetailPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-petugas-desa" 
          element={
          <ProtectedRoute allowedRoles={["petugas_desa"]}>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaDashboardPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/list-petugas-desa" 
          element={
          <ProtectedRoute allowedRoles={["petugas_desa"]}>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaListPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-petugas-desa/detail-permohonan/:id" 
          element={
          <ProtectedRoute allowedRoles={["petugas_desa"]}>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaDetailPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
            path="/admin/data-warga" 
            element={
              <ProtectedRoute allowedRoles={["petugas_desa"]}>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <DataWargaPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route
            path="/admin/manajemen-user" 
            element={
              <ProtectedRoute allowedRoles={["petugas_desa"]}>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <ManajemenUserPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="/admin/kelola-berita" 
            element={
              <ProtectedRoute allowedRoles={["petugas_desa"]}>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <KelolaBeritaPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
          path="/admin/kelola-profil-desa" 
          element={
            <ProtectedRoute allowedRoles={["petugas_desa"]}>
              <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                <KelolaProfilDesaPage />
              </AdminLayout>
            </ProtectedRoute>} />

            <Route
  path="/admin/dashboard-surat-kades"
  element={
    <ProtectedRoute allowedRoles={["kepala_desa"]}>
      <AdminLayout>
        <KadesDashboardPage />
      </AdminLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/list-kades"
  element={
    <ProtectedRoute allowedRoles={["kepala_desa"]}>
      <AdminLayout>
        <KadesListPage />
      </AdminLayout>
    </ProtectedRoute>
  }
/>

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
