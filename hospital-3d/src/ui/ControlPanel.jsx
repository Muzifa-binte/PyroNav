import { useState } from 'react'
import { SENSORS } from '../data/sensorRegistry'
import { useSimStore } from '../state/useSimStore'
import MessagesTab from './MessagesTab'
import SensorsTab from './SensorsTab'
import SettingsTab from './SettingsTab'

const TABS = [
  { id: 'sensors', label: 'Sensors', Comp: SensorsTab },
  { id: 'messages', label: 'Messages', Comp: MessagesTab },
  { id: 'settings', label: 'Settings', Comp: SettingsTab },
]

export default function ControlPanel() {
  const [tab, setTab] = useState('sensors')
  const logCount = useSimStore((s) => s.log.length)
  const Active = TABS.find((t) => t.id === tab).Comp
  return (
    <aside className="panel" aria-label="Sensor controls">
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                  className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'sensors' && <span className="badge">{SENSORS.length}</span>}
            {t.id === 'messages' && logCount > 0 && <span className="badge">{logCount}</span>}
          </button>
        ))}
      </nav>
      <div className="panel-body" role="tabpanel">
        <Active />
      </div>
    </aside>
  )
}
