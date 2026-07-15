import { Link } from "react-router-dom";

export function SidebarBerita({ beritaLain }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
      <h3 className="font-bold text-gray-800 text-xs tracking-wide uppercase">
        berita lain
      </h3>

      <div className="space-y-4">
        {beritaLain.map((item) => (
          <Link
            key={item.id}
            to={`/berita/${item.id}`}
            className="flex flex-col border border-gray-100 rounded-xl p-2 hover:bg-gray-50 transition group"
          >
            {/* Menggunakan item.imageUrl */}
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-24 object-cover rounded-lg mb-2"
            />
            <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#4CAF4F] transition line-clamp-2">
              {item.title}
            </h4>
            {/* Menggunakan item.date */}
            <span className="text-[10px] text-gray-400 mt-1">{item.date}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
