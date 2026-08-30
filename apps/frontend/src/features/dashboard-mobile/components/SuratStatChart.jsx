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

  // ==========================================
  // DAFTAR JENIS SURAT
  // ==========================================

  const letterTypes = useMemo(() => {
    if (!letters?.length) {
      return [];
    }

    const map = new Map();

    letters.forEach((item) => {
      const type = item?.letter_type;

      if (!type) return;

      if (!map.has(type.id)) {
        map.set(type.id, {
          id: type.id,
          name: type.name,
        });
      }
    });

    return Array.from(map.values());
  }, [letters]);

  // ==========================================
  // LOAD CHART
  // + AUTO REFRESH 5 DETIK
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const fetchChart = async () => {

      try {

        setLoading(true);

        const response = await api.get(
          "/api/dashboard/letter-stats",
          {
            params: {
              date: selectedDate,
              letter_type: letterType,
            },
          }
        );

        if (cancelled) return;

        const chart = response?.data?.chart;

        if (!chart) {
          console.error(
            "Data chart tidak ditemukan:",
            response?.data
          );

          setChartData([]);
          setMaxY(50);

          return;
        }

        const labels = chart.labels ?? [];
        const values = chart.values ?? [];

        const formattedData = labels.map(
          (label, index) => ({
            kategori: label,
            jumlah: Number(values[index] ?? 0),
          })
        );

        setChartData(formattedData);

        setMaxY(Number(chart.maxY ?? 50));
      } catch (err) {
        if (!cancelled) {
          console.error(
            "GET LETTER STATS ERROR:",
            err.response?.data ?? err
          );

          setChartData([]);
          setMaxY(50);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

    };


    // Load pertama
    fetchChart();

    const interval = setInterval(() => {
      fetchChart();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedDate, letterType]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="sid-surat-stat-chart">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="sid-surat-stat-chart-header">

        <div className="sid-surat-stat-chart-title">
          <h3>Statistik Pengajuan Surat</h3>

          <p>Distribusi jumlah surat</p>
        </div>

        <div className="sid-surat-stat-chart-filters">

          {/* KALENDER */}

          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.();
            }}
            className="sid-surat-stat-chart-date"
          >

            <span>
              {new Date(
                `${selectedDate}T00:00:00`
              ).toLocaleDateString("id-ID", {
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
            onChange={(e) => {
              setSelectedDate(e.target.value);
            }}
            className="sid-surat-stat-chart-date-input"
          />

          {/* JENIS SURAT */}

          <select
            value={letterType}
            onChange={(e) => {
              setLetterType(e.target.value);
            }}
            className="sid-surat-stat-chart-select"
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

      {/* ======================================
          CHART
      ====================================== */}

      <div className="sid-surat-stat-chart-area">

        <ResponsiveContainer
          width="100%"
          height={180}
        >
          <AreaChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="sidSuratStatGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--sid-primary)"
                  stopOpacity={0.35}
                />

                <stop
                  offset="95%"
                  stopColor="var(--sid-primary)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="kategori"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "var(--sid-text-muted)",
              }}
            />

            <YAxis
              domain={[0, maxY]}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "var(--sid-text-muted)",
              }}
            />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="jumlah"
              stroke="var(--sid-primary)"
              strokeWidth={2}
              fill="url(#sidSuratStatGradient)"
              isAnimationActive={!loading}
            />
          </AreaChart>
        </ResponsiveContainer>

      </div>
    </div>
  );
}