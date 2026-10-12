import { Map, MapPinned, Network } from 'lucide-react'

const TABS = [
  {
    key: 'dusun',
    label: 'Dusun',
    icon: Map,
  },
  {
    key: 'rw',
    label: 'RW',
    icon: Network,
  },
  {
    key: 'rt',
    label: 'RT',
    icon: MapPinned,
  },
]

export default function WilayahTabs({ activeTab, onChange }) {
  return (
    <div className="sid-wilayah-tabs">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`sid-wilayah-tab ${activeTab === key ? 'sid-wilayah-tab-active' : ''}`}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
