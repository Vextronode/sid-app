// ==========================================
// KelolaProfilDesaPage.jsx
// Halaman kelola profil desa untuk Petugas Desa: tampilan sama seperti
// halaman publik (Informasi Umum, Perangkat Desa, Visi Misi, Struktur
// Wilayah), tapi tiap card punya tombol edit yang membuka form popup.
// ==========================================

import { useState } from 'react';
import { Pencil, MapPin, Users, Home } from 'lucide-react';
import { useProfilDesa } from '@/features/profil-desa-admin/hooks/useProfilDesa';
import EditInformasiUmumModal from '@/features/profil-desa-admin/components/EditInformasiUmumModal';
import EditPerangkatDesaModal from '@/features/profil-desa-admin/components/EditPerangkatDesaModal';
import EditVisiMisiModal from '@/features/profil-desa-admin/components/EditVisiMisiModal';

export default function KelolaProfilDesaPage() {
  const { data, updateInformasiUmum, updatePerangkatDesa, updateVisiMisi } = useProfilDesa();

  const [modalInfo, setModalInfo] = useState(false);
  const [modalPerangkat, setModalPerangkat] = useState(false);
  const [modalVisiMisi, setModalVisiMisi] = useState(false);

  const infoFields = [
    { label: 'Nama Desa', value: data.informasiUmum.namaDesa },
    { label: 'Kecamatan', value: data.informasiUmum.kecamatan },
    { label: 'Kabupaten', value: data.informasiUmum.kabupaten },
    { label: 'Kode Desa', value: data.informasiUmum.kodeDesa },
    { label: 'Kepala Desa', value: data.informasiUmum.kepalaDesa },
    { label: 'Alamat', value: data.informasiUmum.alamat },
    { label: 'Telepon', value: data.informasiUmum.telepon },
  ];

  const perangkatFields = [
    { label: 'Kepala Desa', value: data.perangkatDesa.kepalaDesa },
    { label: 'Sekretaris Desa', value: data.perangkatDesa.sekretarisDesa },
    { label: 'Kaur Umum', value: data.perangkatDesa.kaurUmum },
    { label: 'Kaur Keuangan', value: data.perangkatDesa.kaurKeuangan },
    { label: 'Kaur Perencanaan', value: data.perangkatDesa.kaurPerencanaan },
    { label: 'Kasi Pemerintahan', value: data.perangkatDesa.kasiPemerintahan },
    { label: 'Kasi Pelayanan', value: data.perangkatDesa.kasiPelayanan },
    { label: 'Kasi Kesejahteraan', value: data.perangkatDesa.kasiKesejahteraan },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profil Desa</h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Informasi Umum */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-500 tracking-wide">INFORMASI UMUM</h3>
            <button onClick={() => setModalInfo(true)} className="text-green-600 hover:text-green-700" title="Edit">
              <Pencil size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {infoFields.map((f) => (
              <div key={f.label} className="grid grid-cols-2 text-sm border-b pb-2">
                <span className="text-gray-500">{f.label}</span>
                <span className="text-gray-800 font-medium">: {f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Perangkat Desa */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">PERANGKAT DESA</h3>
            <button onClick={() => setModalPerangkat(true)} className="text-green-600 hover:text-green-700" title="Edit">
              <Pencil size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {perangkatFields.map((f) => (
              <div key={f.label} className="grid grid-cols-2 text-sm border-b pb-2">
                <span className="text-gray-500">{f.label}</span>
                <span className="text-gray-800 font-medium">: {f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visi Misi */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">VISI</h3>
          <button onClick={() => setModalVisiMisi(true)} className="text-green-600 hover:text-green-700" title="Edit">
            <Pencil size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-6">{data.visiMisi.visi}</p>

        <h3 className="font-semibold text-gray-800 mb-3">MISI</h3>
        <ol className="flex flex-col gap-2">
          {data.visiMisi.misi.map((item, i) => (
            <li key={i} className="text-sm text-gray-600">{i + 1}. {item}</li>
          ))}
        </ol>
      </div>

      {/* Struktur Wilayah — read-only ringkasan, edit detail dusun/RW/RT
          bisa dibangun terpisah nanti kalau dibutuhkan */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Struktur Wilayah — Dusun, RW &amp; RT</h3>
        <div className="flex gap-4 mb-4">
          <span className="bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <MapPin size={14} /> {data.strukturWilayah.length} Dusun
          </span>
          <span className="bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <Users size={14} /> {data.strukturWilayah.reduce((sum, d) => sum + d.jumlahRW, 0)} RW
          </span>
          <span className="bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <Home size={14} /> {data.strukturWilayah.reduce((sum, d) => sum + d.jumlahRT, 0)} RT
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {data.strukturWilayah.map((dusun) => (
            <button
              key={dusun.id}
              className="bg-green-600 text-white rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 hover:bg-green-700"
            >
              <MapPin size={16} /> {dusun.nama}
            </button>
          ))}
        </div>
      </div>

      <EditInformasiUmumModal
        open={modalInfo}
        onClose={() => setModalInfo(false)}
        onSubmit={(form) => { updateInformasiUmum(form); setModalInfo(false); }}
        initialData={data.informasiUmum}
      />
      <EditPerangkatDesaModal
        open={modalPerangkat}
        onClose={() => setModalPerangkat(false)}
        onSubmit={(form) => { updatePerangkatDesa(form); setModalPerangkat(false); }}
        initialData={data.perangkatDesa}
      />
      <EditVisiMisiModal
        open={modalVisiMisi}
        onClose={() => setModalVisiMisi(false)}
        onSubmit={(form) => { updateVisiMisi(form); setModalVisiMisi(false); }}
        initialData={data.visiMisi}
      />
    </div>
  );
}