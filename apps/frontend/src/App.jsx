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

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
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
            path="admin/dashboard-surat-rt" 
            element={
              <ProtectedRoute>
                  <AdminLayout>
                  <RTDashboardPage />
                  </AdminLayout>  
              </ProtectedRoute>
              }
            />

          <Route 
            path="admin/list-rt" 
            element= {
              <ProtectedRoute>
                
                  <AdminLayout>
                  <RTListPage /> 
                  </AdminLayout>
                  
                  </ProtectedRoute>} />

          <Route 
            path="admin/dashboard-surat-rt/detail-permohonan/:id" 
            element={
              <ProtectedRoute>
                 <AdminLayout>
                 <RTDetailPage />
                </AdminLayout>
              </ProtectedRoute>} />
       

          <Route 
            path="admin/dashboard-surat-rw" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                 <RWDashboardPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="admin/list-rw" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <RWListPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="admin/dashboard-surat-rw/detail-permohonan/:id" 
            element={
                <ProtectedRoute> 
                  <AdminLayout>
                    <RWDetailPage />
                    </AdminLayout>
                  </ProtectedRoute>} />


          <Route 
          path="admin/dashboard-surat-kadus" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <KadusDashboardPage />
              </AdminLayout>
            </ProtectedRoute>} />

          <Route 
          path="admin/list-kadus" 
          element={
          <ProtectedRoute>
            <AdminLayout>
              <KadusListPage />
            </AdminLayout>
              </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-kadus/detail-permohonan/:id" 
          element={
          <ProtectedRoute>
             <AdminLayout>
              <KadusDetailPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-petugas-desa" 
          element={
          <ProtectedRoute>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaDashboardPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/list-petugas-desa" 
          element={
          <ProtectedRoute>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaListPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
          path="admin/dashboard-surat-petugas-desa/detail-permohonan/:id" 
          element={
          <ProtectedRoute>
            <AdminLayout menuItems={PETUGAS_DESA_MENU}>
              <PetugasDesaDetailPage />
            </AdminLayout>
          </ProtectedRoute>} />

          <Route 
            path="/admin/data-warga" 
            element={
              <ProtectedRoute>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <DataWargaPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route
            path="/admin/manajemen-user" 
            element={
              <ProtectedRoute>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <ManajemenUserPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
            path="/admin/kelola-berita" 
            element={
              <ProtectedRoute>
                <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                  <KelolaBeritaPage />
                </AdminLayout>
              </ProtectedRoute>} />

          <Route 
          path="/admin/kelola-profil-desa" 
          element={
            <ProtectedRoute>
              <AdminLayout menuItems={PETUGAS_DESA_MENU}>
                <KelolaProfilDesaPage />
              </AdminLayout>
            </ProtectedRoute>} />

            <Route
  path="/admin/dashboard-surat-kades"
  element={
    <ProtectedRoute>
      <AdminLayout>
        <KadesDashboardPage />
      </AdminLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/list-kades"
  element={
    <ProtectedRoute>
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
