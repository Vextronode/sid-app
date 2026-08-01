import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useEffect, useState } from "react";
import api from "@/lib/api";


export default function SuratStatChart({ letters = [] }) {


  const [chartData, setChartData] = useState([]);
  const [maxY, setMaxY] = useState(50);
  const [loading, setLoading] = useState(false);
  const [letterTypes, setLetterTypes] = useState([]);
  const now = new Date();
  const [period, setPeriod] = useState("day");

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [letterType, setLetterType] = useState("all");

  useEffect(() => {
  const types = [
    ...new Map(
      letters
        .filter((l) => l.letter_type)
        .map((l) => [l.letter_type.id, l.letter_type])
    ).values(),
  ];


  setLetterTypes(types);
}, [letters]);

  useEffect(() => {
    fetchChart();
  }, [
    period,
    selectedDay,
    selectedWeek,
    selectedMonth,
    selectedYear,
    letterType,
  ]);

  const fetchChart = async () => {

    try {

      setLoading(true);

      const res = await api.get("/api/dashboard/letter-stats", {
        params: {
          period,
          day: selectedDay,
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


    } catch(error){

      console.error(
        "Gagal mengambil statistik surat",
        error.response?.data ?? error
      );

    } finally {

      setLoading(false);

    }

  };


return (
  <div className="bg-white rounded-2xl shadow-sm p-5">

    <div className="flex justify-between items-center mb-4">

      <div>
        <h3 className="font-semibold text-gray-800">
          Statistik Pengiriman Surat
        </h3>

        <p className="text-xs text-gray-400">
          Distribusi jumlah surat
        </p>
      </div>

      <div className="flex gap-2">

<select
    value={period}
    onChange={(e) => setPeriod(e.target.value)}
    className="border rounded-full px-3 py-1 text-xs"
>
    <option value="day">Hari</option>
    <option value="week">Minggu</option>
    <option value="month">Bulan</option>
    <option value="year">Tahun</option>
</select>
{period === "day" && (
    <select
        value={selectedDay}
        onChange={(e) => setSelectedDay(Number(e.target.value))}
        className="border rounded-full px-3 py-1 text-xs"
    >
        <option value={1}>Senin</option>
        <option value={2}>Selasa</option>
        <option value={3}>Rabu</option>
        <option value={4}>Kamis</option>
        <option value={5}>Jumat</option>
        <option value={6}>Sabtu</option>
        <option value={7}>Minggu</option>
    </select>
)}
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
        <option value={1}>Januari</option>
        <option value={2}>Februari</option>
        <option value={3}>Maret</option>
        <option value={4}>April</option>
        <option value={5}>Mei</option>
        <option value={6}>Juni</option>
        <option value={7}>Juli</option>
        <option value={8}>Agustus</option>
        <option value={9}>September</option>
        <option value={10}>Oktober</option>
        <option value={11}>November</option>
        <option value={12}>Desember</option>
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
                <option
                    key={year}
                    value={year}
                >
                    {year}
                </option>
            );
        })}
    </select>
)}

        <select
          value={letterType}
          onChange={(e) => setLetterType(e.target.value)}
          className="border rounded-full px-3 py-1 text-xs"
        >
          <option value="all">
            Semua Jenis
          </option>

          {letterTypes.map((type) => (
            <option
              key={type.id}
              value={type.id}
            >
              {type.name}
            </option>
          ))}
        </select>

      </div>

    </div>

    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>

        <defs>
          <linearGradient
            id="colorJumlah"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
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
        />

        <YAxis
          domain={[0, maxY]}
          ticks={Array.from(
            { length: Math.floor(maxY / 5) + 1 },
            (_, i) => i * 5
          )}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip />

        <Area
          type="monotone"
          dataKey="jumlah"
          stroke="#16a34a"
          strokeWidth={3}
          fill="url(#colorJumlah)"
          isAnimationActive={!loading}
        />

      </AreaChart>
    </ResponsiveContainer>

  </div>
);
}