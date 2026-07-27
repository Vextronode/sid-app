// ==========================================
// ProfilDesaPage.jsx
// Halaman publik Profil Desa, tampilan SAMA persis dengan yang dilihat
// Operator Desa (KelolaProfilDesaPage), tapi TANPA tombol edit — dan
// datanya narik dari sumber yang SAMA (jadi kalau Operator update,
// otomatis muncul juga di sini).
// ==========================================

import { Users, Building2, Home, Eye, ClipboardList } from 'lucide-react';
import { profilDesa } from '@/features/profil-desa-admin/data/dummyProfilDesa';

function Avatar({ src, name, size = 'w-14 h-14' }) {
  return (
    <div className={`${size} rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0`}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-400" />}
    </div>
  );
}

export function ProfilDesaPage() {
  const data = profilDesa;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Profil Desa Cibenda</h1>
        <p className="text-sm text-gray-500 max-w-xl">
          Halaman resmi informasi tata kelola, sejarah, dan capaian strategis Desa Cibenda untuk transparansi publik.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 relative rounded-2xl overflow-hidden shadow-sm min-h-[220px] bg-gray-800">
          {data.hero.image ? (
            <img src={data.hero.image} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-600" />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative p-6 flex flex-col justify-end h-full text-white">
            <span className="bg-green-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full self-start mb-2">
              {data.hero.badge}
            </span>
            <h2 className="text-2xl font-bold mb-2">{data.hero.title}</h2>
            <p className="text-sm text-white/90 max-w-md">{data.hero.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Total Penduduk</p>
              <p className="text-xl font-bold text-gray-800">{Number(data.stats.totalPenduduk).toLocaleString('id-ID')}</p>
              <p className="text-[10px] text-green-600">{data.stats.pendudukKeterangan}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Luas Wilayah</p>
              <p className="text-xl font-bold text-gray-800">{data.stats.luasWilayah} ha</p>
              <p className="text-[10px] text-gray-400">{data.stats.luasKeterangan}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Home size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Jumlah Dusun</p>
              <p className="text-xl font-bold text-gray-800">{String(data.stats.jumlahDusun).padStart(2, '0')}</p>
              <p className="text-[10px] text-gray-400">{data.stats.dusunKeterangan}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><Eye size={16} /></div>
              <h3 className="font-semibold text-gray-800">Visi</h3>
            </div>
            <p className="text-sm text-green-700 font-medium italic">"{data.visiMisi.visi}"</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><ClipboardList size={16} /></div>
              <h3 className="font-semibold text-gray-800">Misi</h3>
            </div>
            <ol className="flex flex-col gap-2">
              {data.visiMisi.misi.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><Users size={16} /></div>
          <h3 className="font-semibold text-gray-800">Perangkat Desa</h3>
        </div>

        <div className="flex flex-col items-center mb-6">
          <Avatar src={data.perangkatUtama.kepalaDesa.foto} name={data.perangkatUtama.kepalaDesa.nama} size="w-20 h-20" />
          <p className="font-semibold text-gray-800 mt-2">{data.perangkatUtama.kepalaDesa.nama}</p>
          <p className="text-xs text-green-600">{data.perangkatUtama.kepalaDesa.jabatan}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[data.perangkatUtama.sekretarisDesa, data.perangkatUtama.kaur, data.perangkatUtama.kasi].map((p, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 flex flex-col items-center text-center">
              <Avatar src={p.foto} name={p.nama} size="w-12 h-12" />
              <p className="font-semibold text-gray-800 text-sm mt-2">{p.nama}</p>
              <p className="text-[11px] text-gray-500">{p.jabatan}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs font-semibold text-gray-400 uppercase mb-4">Kepala Dusun (Kadus)</p>
        <div className="flex justify-center gap-6 flex-wrap">
          {data.kadusList.map((k) => (
            <div key={k.id} className="flex flex-col items-center gap-1">
              <Avatar src={k.foto} name={k.nama} size="w-10 h-10" />
              <p className="text-xs text-gray-600">{k.nama}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}