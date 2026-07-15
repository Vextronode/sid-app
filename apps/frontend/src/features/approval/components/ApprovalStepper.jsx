// ==========================================
// ApprovalStepper.jsx
// Progress bar horizontal di halaman detail surat: Submit -> RT -> RW -> Selesai.
// Menunjukkan sudah sampai tahap mana permohonan surat saat ini.
// ==========================================

export default function ApprovalStepper({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        // Tahap yang sudah lewat = hijau centang, tahap sekarang/berikutnya = abu-abu jam
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? '✓' : isCurrent ? '⏱' : index + 1}
              </div>
              <span className="text-xs text-gray-600">{step.label}</span>
              <span className="text-[10px] text-gray-400">{step.timestamp ?? 'Menunggu'}</span>
            </div>

            {/* Garis penghubung antar step, kecuali setelah step terakhir */}
            {index < steps.length - 1 && <div className="w-16 h-px bg-gray-300 mx-2" />}
          </div>
        );
      })}
    </div>
  );
}