// ==========================================
// StatusTabsRT.jsx
// Tab hijau semua/pending/rejected/approved untuk halaman list RT.
// ==========================================

export default function StatusTabsRT({ tabs, activeTab, onChange }) {
  return (
    <div className="flex bg-green-500">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-green-600 text-white border-b-2 border-white' : 'text-white/90 hover:bg-green-600/60'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}