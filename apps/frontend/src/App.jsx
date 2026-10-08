import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext'

import LoginPage from '@/pages/LoginPage'
import { BerandaPage } from '@/pages/BerandaPage'
import { DetailBeritaPage } from '@/pages/DetailBeritaPage'
import { BeritaPage } from '@/pages/BeritaPage'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProfilDesaPage } from '@/pages/ProfilDesaPage'
import { PengajuanSuratPage } from '@/pages/PengajuanSuratPage'
import { RevisiSuratPage } from '@/pages/RevisiSuratPage'
import { DaftarSurat } from '@/pages/DaftarSurat'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import JenisSuratPage from '@/pages/JenisSuratPage'
import ProfilePage from '@/pages/ProfilePage'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { OperatorDesaLayout } from '@/components/layout/OperatorDesaLayout'
import DaftarSuratSayaPage from '@/pages/DaftarSuratSayaPage'
import KelolaWilayahPage from '@/pages/admin/KelolaWilayahPage'

// RT — approver tahap 1
// RW — monitoring
import RTDashboardPage from '@/pages/admin/RTDashboardPage'
import RTListPage from '@/pages/admin/RTListPage'
import RWDashboardPage from '@/pages/admin/RWDashboardPage'
import RWListPage from '@/pages/admin/RWListPage'
import AdminProfilePage from '@/pages/admin/AdminProfilePage'

// Kadus — monitoring saja
import KadusDashboardPage from '@/pages/admin/KadusDashboardPage'
import KadusListPage from '@/pages/admin/KadusListPage'

// Kades — approver tahap 2
import KadesDashboardPage from '@/pages/admin/KadesDashboardPage'
import KadesListPage from '@/pages/admin/KadesListPage'

// Operator roles share the overview and letter list; management routes
// are restricted according to their backend capabilities.
import OperatorDesaDashboardPage from '@/pages/admin/OperatorDesaDashboardPage'
import DataWargaPage from '@/pages/admin/DataWargaPage'
import ManajemenUserPage from '@/pages/admin/ManajemenUserPage'
import KelolaBeritaPage from '@/pages/admin/KelolaBeritaPage'
import KelolaProfilDesaPage from '@/pages/admin/KelolaProfilDesaPage'
import OrganisasiBpdPage from '@/pages/admin/OrganisasiBpdPage'
import OrganisasiLembagaPage from '@/pages/admin/OrganisasiLembagaPage'
import OperatorSuratListPage from '@/pages/admin/OperatorSuratListPage'

import ApprovalSettingPage from '@/pages/admin/ApprovalSettingPage'
import ApprovalFlowsPage from '@/pages/admin/ApprovalFlowsPage'
import { getOperatorAllowedRoles } from '@/features/operator-desa/constants/roleNavigation'
const KADES_APPROVER_ROLES = ['kepala_desa', 'sekretaris_desa']

// Route khusus untuk user yang belum login.
// Jika user sudah login, arahkan ke halaman sesuai role.
const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (user) {
    switch (user.role) {
      case 'rt':
        return <Navigate to="/admin/dashboard-surat-rt" replace />
      case 'rw':
        return <Navigate to="/admin/dashboard-surat-rw" replace />
      case 'kadus':
        return <Navigate to="/admin/dashboard-surat-kadus" replace />
      case 'kepala_desa':
      case 'sekretaris_desa':
        return <Navigate to="/admin/dashboard-surat-kades" replace />
      case 'kasi_pelayanan':
      case 'kaur_tu_umum':
      case 'petugas_desa':
        return <Navigate to="/admin/operator-desa" replace />
      case 'warga':
        return <Navigate to="/daftar-surat" replace />
      default:
        return <Navigate to="/" replace />
    }
  }

  return children
}

// Route yang hanya bisa diakses oleh user yang sudah login.
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/loginpage" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ===== HALAMAN PUBLIK ===== */}
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

          {/* ===== WARGA ===== */}
          <Route
            path="/daftar-surat"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <DaftarSurat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jenis-surat"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <JenisSuratPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pengajuan-surat"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <PengajuanSuratPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pengajuan-surat/:kode"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <PengajuanSuratPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/revisi-surat/:id"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <RevisiSuratPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/daftar-surat-saya"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <DaftarSuratSayaPage />
              </ProtectedRoute>
            }
          />

          {/* ===== RT — approve tahap 1 ===== */}
          <Route
            path="/admin/dashboard-surat-rt"
            element={
              <ProtectedRoute allowedRoles={['rt']}>
                <AdminLayout>
                  <RTDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-rt"
            element={
              <ProtectedRoute allowedRoles={['rt']}>
                <AdminLayout>
                  <RTListPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute
                allowedRoles={['rt', 'rw', 'kadus', ...KADES_APPROVER_ROLES]}
              >
                <AdminLayout>
                  <AdminProfilePage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== RW — monitoring  ===== */}
          <Route
            path="/admin/dashboard-surat-rw"
            element={
              <ProtectedRoute allowedRoles={['rw']}>
                <AdminLayout>
                  <RWDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-rw"
            element={
              <ProtectedRoute allowedRoles={['rw']}>
                <AdminLayout>
                  <RWListPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== Kadus — monitoring saja ===== */}
          <Route
            path="/admin/dashboard-surat-kadus"
            element={
              <ProtectedRoute allowedRoles={['kadus']}>
                <AdminLayout>
                  <KadusDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-kadus"
            element={
              <ProtectedRoute allowedRoles={['kadus']}>
                <AdminLayout>
                  <KadusListPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== Kepala Desa — approve ===== */}
          <Route
            path="/admin/dashboard-surat-kades"
            element={
              <ProtectedRoute allowedRoles={KADES_APPROVER_ROLES}>
                <AdminLayout>
                  <KadesDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/list-kades"
            element={
              <ProtectedRoute allowedRoles={KADES_APPROVER_ROLES}>
                <AdminLayout>
                  <KadesListPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== OPERATOR DESA — Kasi Pelayanan, Kaur TU Umum, Petugas Desa =====
              1 role gabungan, 1 tampilan yang sama untuk ketiganya.
              Hanya bisa print surat yang sudah kades_approved. */}
          <Route
            path="/admin/operator-desa"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/operator-desa')}>
                <OperatorDesaLayout>
                  <OperatorDesaDashboardPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data-warga"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/data-warga')}>
                <OperatorDesaLayout>
                  <DataWargaPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manajemen-user"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/manajemen-user')}>
                <OperatorDesaLayout>
                  <ManajemenUserPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kelola-berita"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-berita')}>
                <OperatorDesaLayout>
                  <KelolaBeritaPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/kelola-wilayah"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-wilayah')}>
                <OperatorDesaLayout>
                  <KelolaWilayahPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organisasi/bpd"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/organisasi/bpd')}>
                <OperatorDesaLayout>
                  <OrganisasiBpdPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organisasi/lembaga"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/organisasi/lembaga')}>
                <OperatorDesaLayout>
                  <OrganisasiLembagaPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/kelola-profil-desa"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-profil-desa')}>
                <OperatorDesaLayout>
                  <KelolaProfilDesaPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/operator-desa/surat"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/operator-desa/surat')}>
                <OperatorDesaLayout>
                  <OperatorSuratListPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approval-settings"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/approval-settings')}>
                <OperatorDesaLayout>
                  <ApprovalSettingPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approval-flows"
            element={
              <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/approval-flows')}>
                <OperatorDesaLayout>
                  <ApprovalFlowsPage />
                </OperatorDesaLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="/lupa-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['warga']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ===== LOGIN ===== */}
          <Route
            path="/loginpage"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
