import { Map, MapPinned, Network } from 'lucide-react'

import type { WilayahType } from '../types'

const TABS: { key: WilayahType; label: string; icon: typeof Map }[] = [
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

type WilayahTabsProps = { activeTab: WilayahType; onChange: (tab: WilayahType) => void }

export default function WilayahTabs({ activeTab, onChange }: WilayahTabsProps) {
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
