// Fixture API untuk skrip screenshot beranda (K12).
// Bentuk respons mengikuti resource Laravel di apps/backend/app/Http/Resources
// (VillageResource, NewsResource, PublicContactResource) supaya halaman
// dirender seperti dengan backend asli, tetapi isinya tetap sama setiap kali.

export const village = {
  id: 1,
  name: 'Cibenda',
  code: '3218052005',
  head_name: 'Dede Rusliana',
  address: 'Jl. Raya Cibenda No. 1, Cibenda, Parigi, Pangandaran',
  phone: '0265639123',
  district: 'Parigi',
  regency: 'Pangandaran',
  province: 'Jawa Barat',
  postal_code: '46393',
  email: 'pemdes@cibenda.desa.id',
  has_stamp_img: false,
  history: 'Desa Cibenda berdiri sejak masa pemekaran wilayah Parigi.',
  vision: 'Terwujudnya Desa Cibenda yang maju, mandiri, dan sejahtera.',
  mission: ['Meningkatkan pelayanan publik.', 'Mengembangkan potensi ekonomi desa.'],
}

const newsItem = (id, title, publishedAt, thumbnail) => ({
  id,
  village_id: 1,
  author_id: 1,
  author_name: 'Operator Desa',
  title,
  slug: `berita-${id}`,
  content:
    '<p>Pemerintah Desa Cibenda menggelar kegiatan bersama warga di balai desa. ' +
    'Kegiatan ini diikuti perwakilan setiap dusun dan berlangsung tertib.</p>' +
    '<p>Paragraf kedua berisi rincian kegiatan.</p>',
  thumbnail,
  is_published: true,
  published_at: publishedAt,
})

const HERO = '/assets/image/beranda/hero-pemandangan.jpg'

export const news = [
  newsItem(1, 'Musyawarah desa membahas rencana kerja pemerintah desa 2027', '2026-10-08T08:00:00Z', HERO),
  newsItem(2, 'Posyandu balita Dusun Sukamaju dibuka setiap Selasa', '2026-10-05T08:00:00Z', null),
  newsItem(3, 'Kerja bakti membersihkan saluran irigasi sawah', '2026-10-01T08:00:00Z', HERO),
  newsItem(4, 'Pendaftaran pelatihan UMKM untuk warga dibuka', '2026-09-27T08:00:00Z', null),
  newsItem(5, 'Penyaluran bantuan langsung tunai tahap ketiga', '2026-09-20T08:00:00Z', null),
]

export const contacts = [
  {
    position: 'kasi_pelayanan',
    name: 'Asep Saepudin',
    phone_wa: '6281234567890',
    wa_link: 'https://wa.me/6281234567890',
  },
]

export const wargaUser = {
  id: 10,
  name: 'Warga Contoh',
  username: 'warga.contoh',
  role: 'warga',
  must_change_password: false,
}

// Mengembalikan { status, body } untuk path API, atau null bila tidak dikenal.
export function resolveFixture(pathname, auth) {
  if (pathname === '/api/user') {
    return auth === 'warga'
      ? { status: 200, body: wargaUser }
      : { status: 401, body: { message: 'Unauthenticated.' } }
  }
  if (pathname.startsWith('/sanctum/')) return { status: 204, body: null }

  switch (pathname) {
    case '/api/public/home':
      return {
        status: 200,
        body: { data: { village, latest_news: news.slice(0, 3), public_stats: { total_letter_types: 10 } } },
      }
    case '/api/public/village-profile':
      return { status: 200, body: { data: village } }
    case '/api/public/news':
      return {
        status: 200,
        body: { data: news, meta: { current_page: 1, last_page: 1, per_page: 10, total: news.length } },
      }
    case '/api/public/contact-us':
      return { status: 200, body: { data: contacts } }
    case '/api/notifications/unread-count':
      return { status: 200, body: { count: 0 } }
    default:
      // Endpoint lain (letter-types, regulations, letters, dll.): daftar kosong.
      return { status: 200, body: { data: [] } }
  }
}
