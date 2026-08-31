// ==========================================
// DashboardFlowCard.jsx
// Card status surat dengan filter periode dan carousel.
// Styling mengikuti SID Global Theme.
// ==========================================

import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardFlowCard({
  letters = [],
  loading,
}) {
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
        const diff =
          (now - date) /
          (1000 * 60 * 60 * 24);

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
      color: "sid-dashboard-status-primary",
    },
    {
      title: "Menunggu RT",
      value: filteredLetters.filter(
        (l) => l.status === "pending"
      ).length,
      color: "sid-dashboard-status-warning",
    },
    {
      title: "Menunggu RW",
      value: filteredLetters.filter(
        (l) => l.status === "rt_approved"
      ).length,
      color: "sid-dashboard-status-info",
    },
    {
      title: "Verifikasi Operator",
      value: filteredLetters.filter(
        (l) => l.status === "rw_approved"
      ).length,
      color: "sid-dashboard-status-cyan",
    },
    {
      title: "Selesai",
      value: filteredLetters.filter(
        (l) => l.status === "kasi_approved"
      ).length,
      color: "sid-dashboard-status-success",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(
        (i) => (i + 1) % cards.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [cards.length]);

  const current = cards[index] ?? cards[0];

  const next = () => {
    setIndex(
      (i) => (i + 1) % cards.length
    );
  };

  const prev = () => {
    setIndex(
      (i) => (i - 1 + cards.length) % cards.length
    );
  };

  return (
    <div className="sid-dashboard-flow-card">
      <div className="sid-dashboard-flow-header">
        <h3 className="sid-dashboard-flow-title">
          Status Surat
        </h3>

        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setIndex(0);
          }}
          className="sid-dashboard-period-select"
        >
          <option value="day">Hari</option>
          <option value="week">Minggu</option>
          <option value="month">Bulan</option>
        </select>
      </div>

      <div className="sid-dashboard-flow-body">
        <button
          onClick={prev}
          className="sid-dashboard-flow-arrow"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="sid-dashboard-flow-content">
          <div
            key={index}
            className="sid-dashboard-flow-slide"
          >
            <p className="sid-dashboard-flow-label">
              {current.title}
            </p>

            <p
              className={`sid-dashboard-flow-value ${current.color}`}
            >
              {loading ? "-" : current.value}
            </p>

            <div className="sid-dashboard-flow-indicators">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`sid-dashboard-flow-indicator ${
                    index === i
                      ? "sid-dashboard-flow-indicator-active"
                      : "sid-dashboard-flow-indicator-inactive"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={next}
          className="sid-dashboard-flow-arrow"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}