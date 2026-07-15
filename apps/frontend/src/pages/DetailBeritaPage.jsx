import { useParams } from "react-router-dom";
import { MainContent } from "@/features/berita/components/MainContent";
import { SidebarBerita } from "@/features/berita/components/SidebarBerita";
import { FooterDesa } from "@/components/layout/FooterDesa";
// Import data dummy dari file constants lu
import { DUMMY_NEWS } from "@/lib/constants/dummyNews";

export function DetailBeritaPage() {
  const { id } = useParams();

  // Cari berita yang pas berdasarkan ID dari URL string
  const beritaDetail = DUMMY_NEWS.find((news) => news.id === Number(id));

  // Ambil berita lain untuk sidebar
  const beritaLain = DUMMY_NEWS.filter((news) => news.id !== Number(id));

  // Handle kalau ID berita tidak ditemukan di array
  if (!beritaDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 font-medium">Berita tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <MainContent berita={beritaDetail} />

          <SidebarBerita beritaLain={beritaLain} />
        </div>
      </main>
      <FooterDesa />
    </div>
  );
}
