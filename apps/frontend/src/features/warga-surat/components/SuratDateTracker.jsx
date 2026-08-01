/* eslint-disable no-unused-vars */
// ==========================================
// SuratDateTracker.jsx
// Pengganti tabel "Status Permohonan". Pilih tanggal lewat date picker,
// lalu tampilkan alur tracking (Submit -> RT -> RW -> Kantor Desa)
// untuk surat yang diajukan di tanggal itu. Kalau ada beberapa surat
// di tanggal yang sama, bisa geser (slide) pakai tombol panah.
// ==========================================

import { useState, useMemo, useRef } from 'react';
import { Calendar, Check, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Hitung tahap tracking dari status surat: 0=Submit, 1=RT, 2=RW, 3=Selesai
function getStepState(status) {
  const map = {
    pending: { step: 1, state: 'current' },
    rt_approved: { step: 2, state: 'current_rw' },
    rt_rejected: { step: 1, state: 'rejected_rt' },
    rw_approved: { step: 3, state: 'done' },
    rw_rejected: { step: 2, state: 'rejected_rw' },
  };
  return map[status] ?? { step: 0, state: 'waiting' };
}

const STEPS = ['Submit', 'RT', 'RW', 'Kantor Desa'];

function TrackingStepper({ status }) {
  const { step, state } = getStepState(status);

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {STEPS.map((label, index) => {
        let circle;
        let color = 'text-gray-400';

        const isRejectedHere = (index === 1 && state === 'rejected_rt') || (index === 2 && state === 'rejected_rw');
        const isDone = index === 0 || (index === 1 && (state === 'current_rw' || state === 'done')) || (index === 2 && state === 'done');
        const isCurrent = (index === 1 && state === 'current') || (index === 2 && state === 'current_rw');

        if (isRejectedHere) {
          circle = <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center"><X size={16} /></div>;
          color = 'text-red-500';
        } else if (isDone) {
          circle = <div className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center"><Check size={16} /></div>;
          color = 'text-green-600';
        } else if (isCurrent) {
          circle = <div className="w-9 h-9 rounded-full border-2 border-green-500 text-green-500 flex items-center justify-center"><Clock size={16} /></div>;
          color = 'text-green-500';
        } else {
          circle = <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">{index + 1}</div>;
        }

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {circle}
              <span className={`text-[11px] font-medium ${color}`}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className="w-8 sm:w-14 h-px bg-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

export default function SuratDateTracker({ letters, loading }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const dateInputRef = useRef(null);

  const filteredLetters = useMemo(() => {
    if (!selectedDate) return [];
    return letters.filter((item) => {
      const raw = item.submitted_at ?? item.created_at;
      if (!raw) return false;
      return new Date(raw).toISOString().slice(0, 10) === selectedDate;
    });
  }, [letters, selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSlideIndex(0);
  };

  const openCalendar = () => {
    dateInputRef.current?.showPicker?.();
  };

  const activeSurat = filteredLetters[slideIndex];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="font-bold text-gray-800">Status Permohonan</h2>
      </div>

      {/* Bar pilih tanggal, ala sketsa */}
      <div className="px-6 pt-4">
        <button
          onClick={openCalendar}
          className="w-full flex items-center justify-between border rounded-full px-4 py-2.5 text-sm text-gray-600 hover:border-green-400"
        >
          <span>{selectedDate ? new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih tanggal pengajuan...'}</span>
          <Calendar size={16} className="text-gray-400" />
        </button>
        {/* input date asli disembunyikan visual, tapi tetap dipakai buat munculin kalender native */}
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
        />
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-6">Memuat data surat...</p>
        ) : !selectedDate ? (
          <p className="text-center text-gray-400 text-sm py-6">Pilih tanggal untuk melihat status pengajuan surat.</p>
        ) : filteredLetters.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Belum ada surat pada tanggal ini.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                disabled={slideIndex === 0}
                className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">{activeSurat?.letter_type?.name ?? '-'}</p>
                <p className="text-[10px] text-gray-400">
                  Surat {slideIndex + 1} dari {filteredLetters.length} · #{activeSurat?.letter_number ?? `SKD-${activeSurat?.id}`}
                </p>
              </div>
              <button
                onClick={() => setSlideIndex((i) => Math.min(filteredLetters.length - 1, i + 1))}
                disabled={slideIndex === filteredLetters.length - 1}
                className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <TrackingStepper status={activeSurat?.status} />

            {/* Titik indikator slide, kalau surat lebih dari 1 */}
            {filteredLetters.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {filteredLetters.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full ${i === slideIndex ? 'bg-green-600' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}