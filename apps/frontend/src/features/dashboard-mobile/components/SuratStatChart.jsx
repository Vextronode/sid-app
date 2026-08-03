import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function SuratStatChart({ letters = [] }) {
  const [chartData, setChartData] = useState([]);
  const [maxY, setMaxY] = useState(50);
  const [loading, setLoading] = useState(false);

  const now = new Date();

  const [period, setPeriod] = useState("week");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [letterType, setLetterType] = useState("all");

const letterTypes = useMemo(() => {
  return [
    ...new Map(
      letters
        .filter((l) => l.letter_type)
        .map((l) => [l.letter_type.id, l.letter_type])
    ).values(),
  ];
}, [letters]);


const fetchChart = async () => {
  try {
    setLoading(true);

    const res = await api.get("/api/dashboard/letter-stats", {
      params: {
        period,
        week: selectedWeek,
        month: selectedMonth,
        year: selectedYear,
        letter_type: letterType,
      },
    });

    const chart = res.data.chart;

    setChartData(
      chart.labels.map((label, index) => ({
        kategori: label,
        jumlah: chart.values[index],
      }))
    );

    setMaxY(chart.maxY);
  } catch (error) {
  console.error(error.response?.data);
} finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchChart();
}, [
  period,
  selectedWeek,
  selectedMonth,
  selectedYear,
  letterType,
]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">
            Statistik Pengajuan Surat
          </h3>
          <p className="text-xs text-gray-400">
            Distribusi jumlah surat
          </p>
        </div>

<div className="flex flex-col gap-2 w-[220px]">
  {/* Baris 1 */}
  <div className="grid grid-cols-2 gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded-full px-3 py-1 text-xs"
          >
            <option value="week">Minggu</option>
            <option value="month">Bulan</option>
            <option value="year">Tahun</option>
          </select>



          {period === "week" && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="border rounded-full px-3 py-1 text-xs"
            >
              <option value={1}>Minggu 1</option>
              <option value={2}>Minggu 2</option>
              <option value={3}>Minggu 3</option>
              <option value={4}>Minggu 4</option>
              <option value={5}>Minggu 5</option>
            </select>
          )}

          {period === "month" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border rounded-full px-3 py-1 text-xs"
            >
              {[
                "Januari",
                "Februari",
                "Maret",
                "April",
                "Mei",
                "Juni",
                "Juli",
                "Agustus",
                "September",
                "Oktober",
                "November",
                "Desember",
              ].map((bulan, index) => (
                <option key={bulan} value={index + 1}>
                  {bulan}
                </option>
              ))}
            </select>
          )}

          {period === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border rounded-full px-3 py-1 text-xs"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = now.getFullYear() - i;

                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          )}
          </div>
          <select
            value={letterType}
            onChange={(e) => setLetterType(e.target.value)}
            className="border rounded-full px-3 py-1 text-xs"
          >
            <option value="all">Semua Jenis</option>

            {letterTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorJumlah" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="#16a34a"
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor="#16a34a"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="kategori"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
          />

          <YAxis
            domain={[0, maxY]}
            ticks={Array.from(
              { length: Math.floor(maxY / 5) + 1 },
              (_, i) => i * 5
            )}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
          />

          <Tooltip />

          <Area
            type="monotone"
            dataKey="jumlah"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#colorJumlah)"
            isAnimationActive={!loading}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}