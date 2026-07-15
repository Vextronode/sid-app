// ==========================================
// Baris tab hijau untuk pindah antar kategori surat: semua / pending / rejected / approved.
// Dipakai bareng di ApprovalListPage untuk role RT maupun RW.
// ==========================================

export default function StatusTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex bg-green-500">
      {tabs.map((tab) => {
        // Tab yang sedang aktif diberi style berbeda supaya user tahu sedang lihat kategori apa
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-green-600 text-white border-b-2 border-white'
                : 'text-white/90 hover:bg-green-600/60'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}