import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardFlowCard({ letters = [], loading }) {
  const [period, setPeriod] = useState("day");
  const [index, setIndex] = useState(0);

  const filteredLetters = useMemo(() => {
    const now = new Date();

    return letters.filter((letter) => {
      const date = new Date(letter.submitted_at);

      if (period === "day") {
        return date.toDateString() === now.toDateString();
      }

      if (period === "week") {
        const diff = (now - date) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      }

      if (period === "month") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [letters, period]);

  const cards = [
  {
    title: "Total Surat",
    value: filteredLetters.length,
    color: "text-green-600",
  },
  {
    title: "Menunggu RT",
    value: filteredLetters.filter((l) => l.status === "pending").length,
    color: "text-orange-500",
  },
  {
    title: "Menunggu RW",
    value: filteredLetters.filter((l) => l.status === "rt_approved").length,
    color: "text-blue-600",
  },
  {
    title: "Verifikasi Operator",
    value: filteredLetters.filter((l) => l.status === "rw_approved").length,
    color: "text-cyan-600",
  },
  {
    title: "Selesai",
    value: filteredLetters.filter((l) => l.status === "kasi_approved").length,
    color: "text-green-700",
  },
];

useEffect(() => {
  const timer = setInterval(() => {
    setIndex((i) => (i + 1) % cards.length);
  }, 5000);

  return () => clearInterval(timer);
}, [cards.length]);





  const current = cards[index] ?? cards[0];

  const next = () => {
    setIndex((i) => (i + 1) % cards.length);
  };

  const prev = () => {
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col justify-between w-full h-full">  
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-700">
          Status Surat
        </h3>

        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setIndex(0);
          }}
          className="text-xs border rounded-lg px-2 py-1 outline-none"
        >
          <option value="day">Hari</option>
          <option value="week">Minggu</option>
          <option value="month">Bulan</option>
        </select>
      </div>

      <div className="flex flex-1 items-center justify-between">

        <button
          onClick={prev}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 overflow-hidden">
  <div
    key={index}
    className="text-center animate-[fadeIn_.25s_ease]"
  >
          <p className="text-xs uppercase text-gray-400 mb-2">
            {current.title}
          </p>

          <p className={`text-4xl font-bold ${current.color}`}>
            {loading ? "-" : current.value}
          </p>

          <div className="flex justify-center gap-2 mt-4">
  {cards.map((_, i) => (
    <button
      key={i}
      onClick={() => setIndex(i)}
      className={`h-2 rounded-full transition-all duration-300 ${
        index === i
          ? "w-6 bg-green-600"
          : "w-2 bg-gray-300"
      }`}
    />
  ))}
</div>
          
        </div>
        </div>

        <button
          onClick={next}
          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <ChevronRight size={18} />
        </button>

      </div>
    </div>
  );
}