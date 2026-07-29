import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// Warna untuk Laki-laki dan Perempuan
const COLOR_LAKI = "#22c55e"; // Hijau
const COLOR_PEREMPUAN = "#f472b6"; // Pink

export default function GenderStatCard({
  total,
  laki,
  perempuan,
}) {
  const data = [
    {
      name: "Laki-laki",
      value: laki,
      fill: COLOR_LAKI,
    },
    {
      name: "Perempuan",
      value: perempuan,
      fill: COLOR_PEREMPUAN,
    },
  ];

  // Custom Label untuk menampilkan persentase di dalam segmen Pie
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (percent === 0) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[9px] font-bold select-none drop-shadow-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 max-w-sm">
      {/* Container Utama dengan Tata Letak Sejajar/Simetris */}
      <div className="flex flex-col gap-4">
        
        {/* Baris Atas: Total Warga (Kiri) & Pie Chart Kecil (Kanan) */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wide">
              Total Warga
            </p>
            <p className="text-3xl font-extrabold text-black mt-1">
              {total.toLocaleString("id-ID")}
            </p>
          </div>

          {/* Pie Chart dibuat lebih kecil (w-14 h-14) */}
          <div className="w-14 h-14">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  outerRadius={26}
                  innerRadius={0}
                  stroke="none"
                  startAngle={90}
                  endAngle={450}
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Baris Bawah: Angka Laki-laki & Perempuan SEJAJAR */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {/* Laki-laki */}
          <div className="flex items-center gap-1.5 text-xs text-black font-medium">
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLOR_LAKI }} 
            />
            <span>{laki.toLocaleString("id-ID")} Laki-laki</span>
          </div>

          {/* Perempuan */}
          <div className="flex items-center gap-1.5 text-xs text-black font-medium">
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLOR_PEREMPUAN }} 
            />
            <span>{perempuan.toLocaleString("id-ID")} Perempuan</span>
          </div>
        </div>

      </div>
    </div>
  );
}