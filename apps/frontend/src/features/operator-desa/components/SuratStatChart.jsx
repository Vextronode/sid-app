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


export default function SuratStatChart() {

  const [period, setPeriod] = useState("day");
  const [chartData, setChartData] = useState([]);
  const [maxY, setMaxY] = useState(50);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    fetchChart();
  }, [period]);


  const fetchChart = async () => {

    try {

      setLoading(true);

      const res = await api.get(
        `/api/dashboard/letter-stats?period=${period}`
      );


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


        <select
          value={period}
          onChange={(e)=>setPeriod(e.target.value)}
          className="border rounded-full px-3 py-1 text-xs"
        >
          <option value="day">
            Hari
          </option>

          <option value="week">
            Minggu
          </option>

          <option value="month">
            Bulan
          </option>



        </select>

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
            domain={[0,maxY]}
            ticks={
              Array.from(
                {
                  length: Math.floor(maxY / 5) + 1
                },
                (_,i)=>i*5
              )
            }
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