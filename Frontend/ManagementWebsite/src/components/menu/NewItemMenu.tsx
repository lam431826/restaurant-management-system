import { useEffect, useRef, useState } from 'react'
import type { NewItemKind } from './AddItemModal'

interface Props {
  onSelect: (kind: NewItemKind) => void
}

const PlusSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle shrink-0">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ITEMS: { kind: NewItemKind; label: string }[] = [
  { kind: 'mon', label: 'Món' },
  { kind: 'topping', label: 'Topping' },
  { kind: 'dichvu', label: 'Dịch vụ' },
  { kind: 'combo', label: 'Combo, Buffet' },
]

const NewItemMenu = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const pick = (kind: NewItemKind) => {
    setOpen(false)
    onSelect(kind)
  }

  return (
    <div ref={ref} className="relative">
      <div className="inline-flex items-stretch">
        <button
          className="kv-btn kv-btn-primary h-10 rounded-r-none"
          onClick={() => setOpen(o => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Món mới
        </button>
        <button
          className="kv-btn kv-btn-primary h-10 w-8 px-0 rounded-l-none border-l border-l-[rgba(var(--kv-white-rgb),0.3)]"
          aria-label="Thêm tùy chọn"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] bg-card border border-line-default rounded-md shadow-md min-w-[20rem] py-2 z-[var(--kv-z-dropdown)]">
          {ITEMS.map(item => (
            <button
              key={item.kind}
              onClick={() => pick(item.kind)}
              className="flex items-center gap-3 w-full px-5 py-2.5 text-md text-ink cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] hover:text-primary [&:hover_svg]:text-primary"
            >
              <PlusSmall />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NewItemMenu
