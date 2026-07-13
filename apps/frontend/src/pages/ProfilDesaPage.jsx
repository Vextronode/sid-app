import { InformasiUmum } from "@/features/profil-desa/components/InformasiUmum";
import { PerangkatDesa } from "@/features/profil-desa/components/PerangkatDesa";
import { VisiMisi } from "@/features/profil-desa/components/VisiMisi";
import { StrukturWilayah } from "@/features/profil-desa/components/StrukturWilayah";
import { FooterDesa } from "@/components/layout/FooterDesa";

export function ProfilDesaPage() {
  // Data dummy profile deasa
  const infoDesa = {
    namaDesa: "Cibenda",
    kecamatan: "Parigi",
    kabupaten: "Pangandaran",
    kodeDesa: "3201080012",
    kepalaDesa: "H. Ade Supriatna",
    alamat: "Jl. Raya Cibenda No. 1",
    telepon: "(0265) 123456",
  };

  const perangkatDesa = [
    { jabatan: "Kepala Desa", nama: "H. Ade Supriatna" },
    { jabatan: "Sekretaris Desa", nama: "Drs. Rudi Hermawan" },
    { jabatan: "Kaur Umum", nama: "Siti Rahayu, S.Sos" },
    { jabatan: "Kaur Keuangan", nama: "Agus Purnomo, S.E." },
    { jabatan: "Kaur Perencanaan", nama: "Dian Fitriani" },
    { jabatan: "Kasi Pemerintahan", nama: "Bambang Sutrisno" },
    { jabatan: "Kasi Pelayanan", nama: "Neng Yanti, A.Md" },
    { jabatan: "Kasi Kesejahteraan", nama: "H. Maman Suherman" },
  ];

  const dataVisi =
    "Terwujudnya Desa Cibenda yang mandiri, sejahtera, dan berdaya saing melalui pemberdayaan masyarakat berbasis potensi lokal.";
  const dataMisi = [
    "Meningkatkan kualitas pelayanan publik",
    "Memberdayakan masyarakat desa berbasis potensi lokal",
    "Memperkuat tata kelola desa yang partisipatif",
    "Mengembangkan infrastruktur dan fasilitas desa secara merata",
  ];

  const wilayahStats = { dusun: 5, rw: 25, rt: 5 };
  const daftarDusun = ["Cibenda", "Cibenda"];

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 space-y-6">
        <h1 className="text-xl font-bold text-gray-800 px-1">Profil Desa</h1>

        {/* Info umum & Perangkat desa */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <InformasiUmum data={infoDesa} />
          </div>
          <div>
            <PerangkatDesa listPerangkat={perangkatDesa} />
          </div>
        </div>

        {/* Visi Misi Visi Misi Foya foya */}
        <VisiMisi visi={dataVisi} misi={dataMisi} />

        {/* Struktur Wilayah */}
        <StrukturWilayah stats={wilayahStats} dusunList={daftarDusun} />
      </main>

      {/* Footer */}
      <FooterDesa />
    </div>
  );
}
