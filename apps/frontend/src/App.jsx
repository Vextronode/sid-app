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
            path="/pengajuan-surat/:kode"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PengajuanSuratPage />
                </MainLayout>
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
