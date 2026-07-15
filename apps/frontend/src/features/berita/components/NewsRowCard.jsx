import { Link } from "react-router-dom";

export function NewsRowCard({ data }) {
  return (
    <Link
      to={`/berita/${data.id}`}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition group"
    >
      {/* Bagian Gambar */}
      <div className="w-full sm:w-48 h-36 bg-gray-100 rounded-xl overflow-hidden shrink-0">
        <img
          src={data.imageUrl}
          alt={data.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
      </div>

      {/* Bagian Konten Teks */}
      <div className="flex flex-col justify-between grow py-1">
        <div>
          {/* Judul */}
          <h3 className="font-bold text-gray-800 text-sm md:text-base group-hover:text-[#4CAF4F] transition mb-1">
            {data.title}
          </h3>
          {/* Deskripsi Singkat */}
          <p className="text-xs md:text-sm text-gray-400 line-clamp-2 mb-3">
            {data.description}
          </p>
        </div>

        {/* Footer info di dalam card */}
        <div className="flex items-center gap-3 mt-auto sm:mt-0">
          <span className="bg-gray-50 border border-gray-100 text-gray-500 text-[10px] md:text-xs px-4 py-1 rounded-full">
            {data.category}
          </span>
          <span className="text-[10px] md:text-xs text-gray-400">
            {data.date}
          </span>
        </div>
      </div>
    </Link>
  );
}
