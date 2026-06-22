import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  id: number | string
  text: string
}

interface Props {
  options: SelectOption[]
  value?: SelectOption | null
  placeholder?: string
  faded?: boolean
  className?: string
  onChange?: (option: SelectOption) => void
}

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const CheckMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const Select = ({
  options,
  value,
  placeholder = 'Chọn...',
  faded = false,
  className = '',
  onChange,
}: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (opt: SelectOption) => {
    onChange?.(opt)
    setOpen(false)
  }

  const label = value?.text ?? placeholder

  const triggerClasses = faded
    ? 'bg-[var(--kv-action-primary-faded-bg)] border-[var(--kv-action-primary-faded-border)] text-[var(--kv-action-primary-faded-fg)] hover:bg-[var(--kv-action-primary-faded-bg-hover)]'
    : `bg-field border-line-default text-ink ${open ? 'border-[var(--kv-field-border-focus)]' : 'hover:border-[var(--kv-field-border-hover)]'}`

  const chevronClasses = faded ? 'text-[var(--kv-action-primary-faded-fg)]' : 'text-ink-muted'

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        className={[
          'inline-flex items-center gap-2 h-6 px-3 font-sans text-sm font-medium rounded-full border cursor-pointer whitespace-nowrap select-none transition-colors',
          triggerClasses,
        ].join(' ')}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o) }}
      >
        <span>{label}</span>
        <span className={`shrink-0 flex items-center transition-transform ${open ? 'rotate-180' : ''} ${chevronClasses}`}>
          <ChevronDown />
        </span>
      </div>

      {open && (
        <div className="absolute top-[calc(100%+0.6rem)] right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] min-w-[16rem] max-h-[30rem] overflow-y-auto py-2" role="listbox">
          {options.map(opt => {
            const selected = value?.id === opt.id
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={selected}
                className={[
                  'flex items-center justify-between gap-3 px-5 py-2 text-md min-h-[3.6rem] cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)]',
                  selected ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink',
                ].join(' ')}
                onClick={() => select(opt)}
              >
                <span>{opt.text}</span>
                {selected && (
                  <span className="w-[1.4rem] h-[1.4rem] text-primary shrink-0">
                    <CheckMark />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Select
