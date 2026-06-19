import { useState, useRef, useEffect } from 'react'
import { branches } from '../../data/mockData'

const BranchSelect = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div
        className={[
          'flex items-center h-8 rounded-full bg-field px-4 cursor-pointer border transition-colors',
          open ? 'border-primary' : 'border-line-default hover:border-line-strong',
        ].join(' ')}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o) }}
      >
        <input
          className="border-none outline-none bg-transparent font-sans text-md text-ink flex-1 min-w-0 w-full cursor-pointer placeholder:text-ink-muted"
          placeholder="Tất cả chi nhánh"
          readOnly
          tabIndex={-1}
        />
      </div>

      {open && (
        <div className="kv-float-container left-0 right-0 p-0 overflow-hidden" role="menu" aria-hidden={!open}>
          <ul className="list-none m-0 py-1" role="listbox">
            {branches.map(b => (
              <li key={b.id}>
                <div
                  className="flex items-center min-h-[3.6rem] px-4 py-2 cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)]"
                  role="option"
                  aria-selected={false}
                >
                  <span className="text-md text-ink">{b.name}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-t border-line">
            <button className="kv-btn kv-btn-text-primary kv-btn-sm">Đặt lại</button>
          </div>
        </div>
      )}
    </div>
  )
}

const DashboardHeader = () => (
  <header className="flex justify-between items-center mb-4">
    <h1 className="text-h1 font-bold text-ink m-0">Bức tranh kinh doanh</h1>
    <div className="w-[21rem] shrink-0">
      <BranchSelect />
    </div>
  </header>
)

export default DashboardHeader
