export function MainContent({ berita }) {
  return (
    <div className="lg:col-span-3 space-y-4">
      {/* Judul */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4 px-2">
        {berita.title}
      </h1>

      {/* Image */}
      <div className="w-full overflow-hidden rounded-xl shadow-sm border border-gray-200 bg-white p-2">
        <img
          src={berita.imageUrl}
          alt={berita.title}
          className="w-full h-75 md:h-100 object-cover rounded-lg"
        />
      </div>

      {/* Card Deskripsi */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase">
          deskripsi
        </h3>
        <div className="text-sm text-gray-600 space-y-2 leading-relaxed">
          {berita.content?.map((text, idx) => (
            <p key={idx}>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
