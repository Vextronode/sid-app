export function VisiMisi({ visi, misi }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div>
        <h4 className="font-bold text-gray-800 text-xs tracking-wide uppercase mb-2">
          Visi
        </h4>
        <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
          {visi}
        </p>
      </div>
      <div>
        <h4 className="font-bold text-gray-800 text-xs tracking-wide uppercase mb-2">
          Misi
        </h4>
        <ul className="text-xs md:text-sm text-gray-500 space-y-2 list-none pl-0">
          {misi.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {idx + 1}. {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
