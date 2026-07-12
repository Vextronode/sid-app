import imgNews from "@/assets/images/yaya.jpg";

export const DUMMY_NEWS = Array.from({ length: 6 }).map((_, index) => ({
  id: index + 1,
  title: "Kunjungan ke pantai",
  category: "Kegiatan",
  date: "20 Mei 2026",
  description: "Rapat desa 25 Mei 2026.",
  imageUrl: imgNews,
}));
