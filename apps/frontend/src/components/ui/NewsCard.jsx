export function NewsCard({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col p-3 hover:shadow-md transition-shadow">
      <div className="w-full h-24 md:h-40 bg-gray-200 rounded-xl overflow-hidden mb-3">
        <img
          src={data.imageUrl}
          alt={data.title}
          className="w-full h-full object-cover"
        />
      </div>

      <h3 className="font-bold text-gray-800 text-[11px] md:text-sm text-center mb-2 line-clamp-2">
        {data.title}
      </h3>

      <div className="w-full bg-gray-50 border border-gray-100 text-gray-500 text-[10px] md:text-xs text-center py-1.5 rounded-full mb-3">
        {data.category}
      </div>

      <div className="mt-auto flex justify-between items-center text-[8.5px] md:text-[11px] text-gray-400">
        <span className="truncate mr-2">{data.description}</span>
        <span className="whitespace-nowrap">{data.date}</span>
      </div>
    </div>
  );
}
