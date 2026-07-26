// ==========================================
// SuratStatChart.jsx
// Grafik area distribusi kategori surat, pakai recharts.
// ==========================================

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SuratStatChart({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-semibold text-gray-800">Statistik Pengiriman Surat</h3>
          <p className="text-xs text-gray-400">Distribusi kategori permohonan</p>
        </div>
      </div>
      <select className="border rounded-full px-3 py-1 text-xs text-gray-600 mt-2 mb-4">
        <option>Semua Kategori</option>
      </select>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorJumlah" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="kategori" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
          <Tooltip />
          <Area type="monotone" dataKey="jumlah" stroke="#16a34a" strokeWidth={2} fill="url(#colorJumlah)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}