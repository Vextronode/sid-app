import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext'
import { buildLoginPath, resolveLoginRedirect } from '@/features/auth/utils/loginRedirect'
import {
  HAL_AKSESIBILITAS,
  HAL_BPD,
  HAL_KEBIJAKAN_PRIVASI,
  HAL_LEMBAGA,
  HAL_PPID,
} from '@/lib/constants/routes'
import { PageLoader } from '@/components/ui/PageLoader'
import { ScrollToTop } from '@/components/layout/ScrollToTop'

// Beranda dan layout publik tetap statis agar halaman pertama tidak
// menunggu chunk tambahan; halaman lain dimuat per-route.
import { BerandaPage } from '@/pages/BerandaPage'
import { MainLayout } from '@/components/layout/MainLayout'
import { BerandaLayout } from '@/features/beranda/components/BerandaLayout'
import { OfficialLayout } from '@/components/layout/OfficialLayout'
import {
  SELF_LETTER_ROLES,
  SELF_LETTER_ROUTE,
} from '@/features/notifikasi/utils/notificationTarget'
import { getOperatorAllowedRoles } from '@/features/operator-desa/constants/roleNavigation'
import { letterTargetForRole, roleHomePath } from '@/features/auth/utils/letterLinks'

const lazyNamed = (loader, name) =>
  lazy(() => loader().then((module) => ({ default: module[name] })))

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DetailBeritaPage = lazyNamed(() => import('@/pages/DetailBeritaPage'), 'DetailBeritaPage')
const BeritaPage = lazyNamed(() => import('@/pages/BeritaPage'), 'BeritaPage')
const ProfilDesaPage = lazyNamed(() => import('@/pages/ProfilDesaPage'), 'ProfilDesaPage')
const OrganisasiDesaPage = lazyNamed(
  () => import('@/pages/OrganisasiDesaPage'),
  'OrganisasiDesaPage',
)
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
const KelolaPengumumanPage = lazy(() => import('@/pages/admin/KelolaPengumumanPage'))
const KelolaHalamanInfoPage = lazy(() => import('@/pages/admin/KelolaHalamanInfoPage'))

// Halaman informasi (D6): Kebijakan privasi, Aksesibilitas, PPID.
const InfoPage = lazyNamed(() => import('@/features/info/components/InfoPage'), 'InfoPage')

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
const ActivityLogPage = lazy(() => import('@/pages/admin/ActivityLogPage'))
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
  'staf_sid',
]

// Route khusus untuk user yang belum login.
// Jika user sudah login, arahkan ke halaman sesuai role.
// ?redirect= yang diizinkan untuk role didahulukan (K4).
export const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth()
  const [searchParams] = useSearchParams()

  if (isLoading) {
    return <PageLoader fullscreen />
  }

  if (user) {
    if (user.must_change_password) {
      return <Navigate to="/ganti-password" replace />
    }

    const redirectTo = resolveLoginRedirect(searchParams.get('redirect'), user.role)
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }

    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return children
}

// Route yang hanya bisa diakses oleh user yang sudah login.
// Belum login -> ke halaman login sambil membawa tujuan (?redirect=, K4).
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader fullscreen />
  }

  if (!user) {
    return <Navigate to={buildLoginPath(location.pathname + location.search)} replace />
  }

  // Backend menolak semua endpoint lain sampai kata sandi sementara diganti.
  if (user.must_change_password) {
    return <Navigate to="/ganti-password" replace />
  }

  // Peran lain: halaman surat warga ke padanannya (Surat Saya pejabat),
  // selain itu ke halaman awal perannya, bukan ke beranda publik.
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const fallback = letterTargetForRole(location.pathname, user.role)

    return (
      <Navigate to={fallback === location.pathname ? roleHomePath(user.role) : fallback} replace />
    )
  }

  return children
}

// Pindah halaman: header/sidebar tetap, hanya area konten yang memuat.
const PageLoading = () => <PageLoader />

// Layout route: layout tetap terpasang saat pindah halaman, hanya isi
// (Outlet) yang berganti. Suspense di dalam layout membuat header/sidebar
// tetap tampil selama chunk halaman dimuat.
function PublicShell() {
  return (
    <MainLayout>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  )
}

function OfficialShell() {
  return (
    <ProtectedRoute allowedRoles={OFFICIAL_ROLES}>
      <OfficialLayout>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </OfficialLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoader fullscreen />}>
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
            <Route element={<PublicShell />}>
              <Route path="/berita" element={<BeritaPage />} />
              <Route path="/berita/:id" element={<DetailBeritaPage />} />
              <Route path="/profil-desa" element={<ProfilDesaPage />} />
              <Route path={HAL_BPD} element={<OrganisasiDesaPage variant="bpd" />} />
              <Route path={HAL_LEMBAGA} element={<OrganisasiDesaPage variant="lembaga" />} />
              <Route
                path="/peraturan-desa"
                element={<Navigate to="/profil-desa#peraturan-desa" replace />}
              />

              {/* Halaman informasi (D6); isian khas desa dari menu Halaman Informasi. */}
              {[
                [HAL_KEBIJAKAN_PRIVASI, 'kebijakan-privasi'],
                [HAL_AKSESIBILITAS, 'aksesibilitas'],
                [HAL_PPID, 'ppid'],
              ].map(([path, page]) => (
                <Route key={path} path={path} element={<InfoPage page={page} />} />
              ))}
            </Route>

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

            {/* ===== PEJABAT DESA =====
              Satu layout route untuk semua halaman pejabat: navbar/sidebar,
              notifikasi, dan data wilayah tetap terpasang saat pindah halaman.
              OfficialLayout memilih sidebar operator untuk Kasi/Kaur/Petugas
              Desa dan bilah atas untuk RT/RW/Kadus/Kades/Sekdes. */}
            <Route element={<OfficialShell />}>
              {/* RT — approve tahap 1 */}
              <Route
                path="/admin/dashboard-surat-rt"
                element={
                  <ProtectedRoute allowedRoles={['rt']}>
                    <RTDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/list-rt"
                element={
                  <ProtectedRoute allowedRoles={['rt']}>
                    <RTListPage />
                  </ProtectedRoute>
                }
              />

              {/* RW — monitoring */}
              <Route
                path="/admin/dashboard-surat-rw"
                element={
                  <ProtectedRoute allowedRoles={['rw']}>
                    <RWDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/list-rw"
                element={
                  <ProtectedRoute allowedRoles={['rw']}>
                    <RWListPage />
                  </ProtectedRoute>
                }
              />

              {/* Kadus — monitoring saja */}
              <Route
                path="/admin/dashboard-surat-kadus"
                element={
                  <ProtectedRoute allowedRoles={['kadus']}>
                    <KadusDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/list-kadus"
                element={
                  <ProtectedRoute allowedRoles={['kadus']}>
                    <KadusListPage />
                  </ProtectedRoute>
                }
              />

              {/* Kepala Desa — approve */}
              <Route
                path="/admin/dashboard-surat-kades"
                element={
                  <ProtectedRoute allowedRoles={KADES_APPROVER_ROLES}>
                    <KadesDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/list-kades"
                element={
                  <ProtectedRoute allowedRoles={KADES_APPROVER_ROLES}>
                    <KadesListPage />
                  </ProtectedRoute>
                }
              />

              {/* Profil terbuka untuk semua pejabat. */}
              <Route path="/admin/profile" element={<AdminProfilePage />} />

              {/* Pengajuan surat pribadi oleh pejabat (bukan Petugas Desa). */}
              <Route
                path={SELF_LETTER_ROUTE}
                element={
                  <ProtectedRoute allowedRoles={SELF_LETTER_ROLES}>
                    <SuratSayaPejabatPage />
                  </ProtectedRoute>
                }
              />

              {/* OPERATOR DESA — Kasi Pelayanan, Kaur TU Umum, Petugas Desa.
                Halaman pengelolaan dibatasi sesuai kapabilitas backend. */}
              <Route
                path="/admin/operator-desa"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/operator-desa')}>
                    <OperatorDesaDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/operator-desa/surat"
                element={
                  <ProtectedRoute
                    allowedRoles={getOperatorAllowedRoles('/admin/operator-desa/surat')}
                  >
                    <OperatorSuratListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/data-warga"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/data-warga')}>
                    <DataWargaAccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/manajemen-user"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/manajemen-user')}>
                    <ManajemenUserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kelola-berita"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-berita')}>
                    <KelolaBeritaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kelola-wilayah"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-wilayah')}>
                    <KelolaWilayahPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kelola-pekerjaan"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-pekerjaan')}>
                    <KelolaPekerjaanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kelola-peraturan"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/kelola-peraturan')}>
                    <KelolaPeraturanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pengumuman"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/pengumuman')}>
                    <KelolaPengumumanPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/halaman-informasi"
                element={
                  <ProtectedRoute
                    allowedRoles={getOperatorAllowedRoles('/admin/halaman-informasi')}
                  >
                    <KelolaHalamanInfoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organisasi/bpd"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/organisasi/bpd')}>
                    <OrganisasiBpdPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organisasi/lembaga"
                element={
                  <ProtectedRoute
                    allowedRoles={getOperatorAllowedRoles('/admin/organisasi/lembaga')}
                  >
                    <OrganisasiLembagaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kelola-profil-desa"
                element={
                  <ProtectedRoute
                    allowedRoles={getOperatorAllowedRoles('/admin/kelola-profil-desa')}
                  >
                    <KelolaProfilDesaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pejabat-desa"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/pejabat-desa')}>
                    <PejabatDesaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approval-settings"
                element={
                  <ProtectedRoute
                    allowedRoles={getOperatorAllowedRoles('/admin/approval-settings')}
                  >
                    <ApprovalSettingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approval-flows"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/approval-flows')}>
                    <ApprovalFlowsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/log-aktivitas"
                element={
                  <ProtectedRoute allowedRoles={getOperatorAllowedRoles('/admin/log-aktivitas')}>
                    <ActivityLogPage />
                  </ProtectedRoute>
                }
              />
            </Route>
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
