import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext'
import { buildLoginPath, resolveLoginRedirect } from '@/features/auth/utils/loginRedirect'
import { HAL_AKSESIBILITAS, HAL_KEBIJAKAN_PRIVASI, HAL_PPID } from '@/lib/constants/routes'

// Beranda dan layout publik tetap statis agar halaman pertama tidak
// menunggu chunk tambahan; halaman lain dimuat per-route.
import { BerandaPage } from '@/pages/BerandaPage'
import { MainLayout } from '@/components/layout/MainLayout'
import { BerandaLayout } from '@/features/beranda/components/BerandaLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { OfficialLayout } from '@/components/layout/OfficialLayout'
import { OperatorDesaLayout } from '@/components/layout/OperatorDesaLayout'
import {
  SELF_LETTER_ROLES,
  SELF_LETTER_ROUTE,
} from '@/features/notifikasi/utils/notificationTarget'
import { getOperatorAllowedRoles } from '@/features/operator-desa/constants/roleNavigation'

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })))

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DetailBeritaPage = lazyNamed(() => import('@/pages/DetailBeritaPage'), 'DetailBeritaPage')
const BeritaPage = lazyNamed(() => import('@/pages/BeritaPage'), 'BeritaPage')
const ProfilDesaPage = lazyNamed(() => import('@/pages/ProfilDesaPage'), 'ProfilDesaPage')
const PengajuanSuratPage = lazyNamed(
  () => import('@/pages/PengajuanSuratPage'),
  'PengajuanSuratPage',
)
const DaftarSurat = lazyNamed(() => import('@/pages/DaftarSurat'), 'DaftarSurat')
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const GantiPasswordPage = lazy(() => import('@/pages/GantiPasswordPage'))
const JenisSuratPage = lazy(() => import('@/pages/JenisSuratPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const DaftarSuratSayaPage = lazy(() => import('@/pages/DaftarSuratSayaPage'))
const KelolaWilayahPage = lazy(() => import('@/pages/admin/KelolaWilayahPage'))
const KelolaPekerjaanPage = lazy(() => import('@/pages/admin/KelolaPekerjaanPage'))
const KelolaPeraturanPage = lazy(() => import('@/pages/admin/KelolaPeraturanPage'))
const PeraturanDesaPage = lazyNamed(() => import('@/pages/PeraturanDesaPage'), 'PeraturanDesaPage')

// Halaman informasi (D6) masih draf: hanya ada di mode dev. Saat build,
// import.meta.env.DEV menjadi false sehingga route dan chunk-nya tidak ikut.
const InfoPage = import.meta.env.DEV
  ? lazyNamed(() => import('@/features/info/components/InfoPage'), 'InfoPage')
  : null

// RT — approver tahap 1
// RW — monitoring
const RTDashboardPage = lazy(() => import('@/pages/admin/RTDashboardPage'))
const RTListPage = lazy(() => import('@/pages/admin/RTListPage'))
const RWDashboardPage = lazy(() => import('@/pages/admin/RWDashboardPage'))
const RWListPage = lazy(() => import('@/pages/admin/RWListPage'))
const AdminProfilePage = lazy(() => import('@/pages/admin/AdminProfilePage'))

// Kadus — monitoring saja
const KadusDashboardPage = lazy(() => import('@/pages/admin/KadusDashboardPage'))
const KadusListPage = lazy(() => import('@/pages/admin/KadusListPage'))

// Kades — approver tahap 2
const KadesDashboardPage = lazy(() => import('@/pages/admin/KadesDashboardPage'))
const KadesListPage = lazy(() => import('@/pages/admin/KadesListPage'))

// Operator roles share the overview and letter list; management routes
// are restricted according to their backend capabilities.
const OperatorDesaDashboardPage = lazy(() => import('@/pages/admin/OperatorDesaDashboardPage'))
const DataWargaAccessPage = lazy(() => import('@/pages/admin/DataWargaAccessPage'))
const ManajemenUserPage = lazy(() => import('@/pages/admin/ManajemenUserPage'))
const KelolaBeritaPage = lazy(() => import('@/pages/admin/KelolaBeritaPage'))
const KelolaProfilDesaPage = lazy(() => import('@/pages/admin/KelolaProfilDesaPage'))
const OrganisasiBpdPage = lazy(() => import('@/pages/admin/OrganisasiBpdPage'))
const OrganisasiLembagaPage = lazy(() => import('@/pages/admin/OrganisasiLembagaPage'))
const OperatorSuratListPage = lazy(() => import('@/pages/admin/OperatorSuratListPage'))

const ApprovalSettingPage = lazy(() => import('@/pages/admin/ApprovalSettingPage'))
const ApprovalFlowsPage = lazy(() => import('@/pages/admin/ApprovalFlowsPage'))
const PejabatDesaPage = lazy(() => import('@/pages/admin/PejabatDesaPage'))
const SuratSayaPejabatPage = lazy(() => import('@/pages/admin/SuratSayaPejabatPage'))
const NotificationRedirectPage = lazy(() => import('@/pages/NotificationRedirectPage'))

const KADES_APPROVER_ROLES = ['kepala_desa', 'sekretaris_desa']
// Semua peran pejabat; halaman profil terbuka untuk semuanya.
const OFFICIAL_ROLES = [
  'rt',
  'rw',
  'kadus',
  ...KADES_APPROVER_ROLES,
  'kasi_pelayanan',
  'kaur_tu_umum',
  'petugas_desa',
]

// Route khusus untuk user yang belum login.
// Jika user sudah login, arahkan ke halaman sesuai role.
// ?redirect= yang diizinkan untuk role didahulukan (K4).
export const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (user) {
    if (user.must_change_password) {
      return <Navigate to="/ganti-password" replace />
    }

    const redirectTo = resolveLoginRedirect(searchParams.get('redirect'), user.role)
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }

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
// Belum login -> ke halaman login sambil membawa tujuan (?redirect=, K4).
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to={buildLoginPath(location.pathname + location.search)} replace />
  }

  // Backend menolak semua endpoint lain sampai kata sandi sementara diganti.
  if (user.must_change_password) {
    return <Navigate to="/ganti-password" replace />
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
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* ===== HALAMAN PUBLIK ===== */}
            <Route
              path="/"
              element={
                <BerandaLayout>
                  <BerandaPage />
                </BerandaLayout>
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
              path="/peraturan-desa"
              element={
                <MainLayout>
                  <PeraturanDesaPage />
                </MainLayout>
              }
            />

            {/* Halaman informasi (D6), khusus dev sampai isinya disetujui desa. */}
            {import.meta.env.DEV &&
              [
                [HAL_KEBIJAKAN_PRIVASI, 'kebijakan-privasi'],
                [HAL_AKSESIBILITAS, 'aksesibilitas'],
                [HAL_PPID, 'ppid'],
              ].map(([path, page]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <MainLayout>
                      <InfoPage page={page} />
                    </MainLayout>
                  }
                />
              ))}

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
                <ProtectedRoute allowedRoles={OFFICIAL_ROLES}>
                  <OfficialLayout>
                    <AdminProfilePage />
                  </OfficialLayout>
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
              Hanya bisa print surat yang sudah disetujui final. */}
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
                    <DataWargaAccessPage />
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
              path="/admin/kelola-pekerjaan"
              element={
                <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-pekerjaan')}>
                  <OperatorDesaLayout>
                    <KelolaPekerjaanPage />
                  </OperatorDesaLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kelola-peraturan"
              element={
                <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-peraturan')}>
                  <OperatorDesaLayout>
                    <KelolaPeraturanPage />
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
                <ProtectedRoute
                  allowedRoles={getOperatorAllowedRoles('/admin/operator-desa/surat')}
                >
                  <OperatorDesaLayout>
                    <OperatorSuratListPage />
                  </OperatorDesaLayout>
                </ProtectedRoute>
              }
            />
            {/* Pengajuan surat pribadi oleh pejabat (bukan Petugas Desa). */}
            <Route
              path={SELF_LETTER_ROUTE}
              element={
                <ProtectedRoute allowedRoles={SELF_LETTER_ROLES}>
                  <SuratSayaPejabatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pejabat-desa"
              element={
                <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/pejabat-desa')}>
                  <OperatorDesaLayout>
                    <PejabatDesaPage />
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

            {/* Tujuan tautan reset kata sandi yang dikirim backend lewat email. */}
            <Route
              path="/password-reset/:token"
              element={
                <GuestRoute>
                  <ResetPasswordPage />
                </GuestRoute>
              }
            />

            {/* Wajib ganti kata sandi sementara; halaman ini menjaga aksesnya sendiri. */}
            <Route path="/ganti-password" element={<GantiPasswordPage />} />

            {/* Tujuan klik notifikasi push; diteruskan sesuai peran. */}
            <Route
              path="/buka-notifikasi"
              element={
                <ProtectedRoute>
                  <NotificationRedirectPage />
                </ProtectedRoute>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
