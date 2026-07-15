import imgNews from "@/assets/images/yaya.jpg";

export const DUMMY_NEWS = Array.from({ length: 6 }).map((_, index) => ({
  id: index + 1,
  title: "Kunjungan ke pantai",
  category: "Kegiatan",
  date: "20 Mei 2026",
  description: "Rapat desa 25 Mei 2026.",
  imageUrl: imgNews,

  content: [
    "Terwujudnya Desa Cibenda yang mandiri, sejahtera, dan berdaya saing melalui pemberdayaan masyarakat berbasis potensi lokal.",
    "1. Meningkatkan kualitas pelayanan publik",
    "2. Memberdayakan masyarakat desa berbasis potensi lokal",
    "3. Memperkuat tata kelola desa yang partisipatif",
    "4. Mengembangkan infrastruktur dan fasilitas desa secara merata",
  ],
}));
