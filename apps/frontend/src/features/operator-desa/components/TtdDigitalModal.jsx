// ==========================================
// TtdDigitalModal.jsx
// Popup buat tanda tangan digital pakai canvas (gambar langsung pakai
// mouse/jari). Setelah disimpan, tanda tangan (base64 image) dikirim
// balik lewat onSave, nanti ditempel ke PDF surat.
// ==========================================

import { useRef, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

export default function TtdDigitalModal({ open, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  if (!open) return null;

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="font-bold text-gray-800 text-lg mb-1">Tanda Tangan Digital</h2>
        <p className="text-xs text-gray-400 mb-4">Gambar tanda tangan Anda di area di bawah ini.</p>

        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          className="w-full border-2 border-dashed rounded-xl bg-gray-50 touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />

        <div className="flex gap-3 mt-4">
          <button onClick={handleClear} className="flex items-center gap-2 border border-gray-300 text-gray-600 rounded-lg px-4 py-2.5 text-sm hover:bg-gray-50">
            <RotateCcw size={14} /> Ulangi
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn}
            className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-40"
          >
            Simpan &amp; Tempel ke Surat
          </button>
        </div>
      </div>
    </div>
  );
}