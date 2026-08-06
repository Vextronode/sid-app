import { useState, useEffect, useMemo, useRef } from "react";
import api from "@/lib/api";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Calendar } from "lucide-react";

export default function SuratStatChart({ letters = [] }) {
  const dateInputRef = useRef(null);

  const [chartData, setChartData] = useState([]);
  const [maxY, setMaxY] = useState(50);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [letterType, setLetterType] = useState("all");

  /**
   * Ambil daftar jenis surat unik
   */
  const letterTypes = useMemo(() => {
    if (!letters.length) return [];

    const map = new Map();

    letters.forEach((item) => {
      const type = item.letter_type;

      if (!type) return;

      map.set(type.id, {
        id: type.id,
        name: type.name,
      });
    });

    return [...map.values()];
  }, [letters]);

  /**
   * Fetch Chart
   */
  useEffect(() => {
    const fetchChart = async () => {
      try {
        setLoading(true);

        const { data } = await api.get("/api/dashboard/letter-stats", {
          params: {
            date: selectedDate,
            letter_type: letterType,
          },
        });

        const chart = data.chart;

        setChartData(
          chart.labels.map((label, i) => ({
            kategori: label,
            jumlah: chart.values[i],
          }))
        );

        setMaxY(chart.maxY);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [selectedDate, letterType]);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">

      {/* Header */}
      <div className="flex justify-between items-start mb-5">

        <div>
          <h3 className="font-semibold text-gray-800">
            Statistik Pengajuan Surat
          </h3>

          <p className="text-xs text-gray-400">
            Distribusi jumlah surat
          </p>
        </div>

        <div className="w-56 space-y-2">

          {/* Kalender */}
          <button
            onClick={() => dateInputRef.current?.showPicker()}
            className="w-full flex items-center justify-between border rounded-full px-3 py-2 text-xs hover:border-green-600"
          >
            <span>
              {new Date(selectedDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            <Calendar size={14} />
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute opacity-0 pointer-events-none"
          />

          {/* Jenis Surat */}
          <select
            value={letterType}
            onChange={(e) => setLetterType(e.target.value)}
            className="w-full border rounded-full px-3 py-2 text-xs"
          >
            <option value="all">
              Semua Jenis Surat
            </option>

            {letterTypes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* Chart */}
      <ResponsiveContainer
        width="100%"
        height={180}
      >
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
            tick={{ fontSize: 10 }}
          />

          <YAxis
            domain={[0, maxY]}
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