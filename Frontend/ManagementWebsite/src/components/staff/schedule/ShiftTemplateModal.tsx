import { useEffect, useRef, useState } from 'react'
import type { ShiftTemplate, ShiftTemplateInput } from '../../../services/rosterService'
import { createTemplate, updateTemplate } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'
import { formatTime } from './scheduleUtils'

interface Props {
  template?: ShiftTemplate | null
  onClose: () => void
  onSaved: () => void
}

// ── Time helpers ────────────────────────────────────────────────────────
const STEP = 15
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += STEP) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
})()

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const fromMinutes = (m: number) => {
  const x = ((m % (24 * 60)) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
const addHours = (t: string, h: number) => fromMinutes(toMinutes(t) + h * 60)

/** e.g. "4h, qua đêm" — hours between start→end, flagging overnight wrap. */
const durationLabel = (start: string, end: string) => {
  let diff = toMinutes(end) - toMinutes(start)
  const overnight = diff <= 0
  if (diff <= 0) diff += 24 * 60
  const h = Math.floor(diff / 60)
  const m = diff % 60
  const hm = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  return overnight ? `${hm}, qua đêm` : hm
}

// ── Icons ───────────────────────────────────────────────────────────────
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const inputCls =
  'w-full h-11 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

// ── Time picker (15-min steps) ──────────────────────────────────────────
const TimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (el) listRef.current.scrollTop = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-[7.5rem] h-11 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className="text-md text-ink">{value}</span>
        <ClockIcon />
      </button>
      {open && (
        <div ref={listRef} className="absolute top-[calc(100%+0.4rem)] left-0 w-[7.5rem] max-h-[15rem] overflow-y-auto bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              data-selected={t === value}
              onClick={() => { onChange(t); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-md cursor-pointer transition-colors ${t === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink hover:bg-[var(--kv-state-hover-bg)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ShiftTemplateModal = ({ template, onClose, onSaved }: Props) => {
  const [name, setName]           = useState(template?.name ?? '')
  const [workStart, setWorkStart] = useState(template ? formatTime(template.startTime) : '23:00')
  const [workEnd, setWorkEnd]     = useState(template ? formatTime(template.endTime) : '03:00')
  // Check-in window is UI-only for now — the backend template has no such field.
  const [checkStart, setCheckStart] = useState(template ? formatTime(template.startTime) : '20:00')
  const [checkEnd, setCheckEnd]     = useState(template ? formatTime(template.endTime) : '06:00')
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Changing the work start suggests an end 4 hours later (still adjustable).
  const handleWorkStart = (t: string) => {
    setWorkStart(t)
    setWorkEnd(addHours(t, 4))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên ca làm việc')
      nameRef.current?.focus()
      return
    }
    const payload: ShiftTemplateInput = {
      name: name.trim(),
      startTime: `${workStart}:00`,
      endTime: `${workEnd}:00`,
      // Preserve fields not shown in this simplified form.
      breakMinutes: template?.breakMinutes ?? 0,
      headcountTarget: template?.headcountTarget ?? 1,
      wage: template?.wage ?? 0,
    }
    setSaving(true)
    setError('')
    try {
      if (template) await updateTemplate(template.id, payload)
      else await createTemplate(payload)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu ca làm việc.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[46rem] my-[10vh] bg-card rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-7 h-16 shrink-0">
          <h2 className="text-h3 font-bold text-ink">{template ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="px-7 py-4 flex flex-col gap-5">
          {/* Tên */}
          <div className="flex items-center gap-4">
            <label className="w-[13rem] shrink-0 text-md text-ink">Tên</label>
            <input
              ref={nameRef}
              className={inputCls}
              value={name}
              onChange={e => { setName(e.target.value); if (error) setError('') }}
            />
          </div>

          {/* Giờ làm việc */}
          <div className="flex items-center gap-4">
            <label className="w-[13rem] shrink-0 text-md text-ink flex items-center gap-1.5">
              Giờ làm việc <InfoIcon />
            </label>
            <TimePicker value={workStart} onChange={handleWorkStart} />
            <span className="text-md text-ink-subtle">Đến</span>
            <TimePicker value={workEnd} onChange={setWorkEnd} />
            <span className="text-md text-ink-subtle ml-2 whitespace-nowrap">{durationLabel(workStart, workEnd)}</span>
          </div>

          {/* Giờ cho phép chấm công */}
          <div className="flex items-center gap-4">
            <label className="w-[13rem] shrink-0 text-md text-ink flex items-center gap-1.5">
              Giờ cho phép chấm công <InfoIcon />
            </label>
            <TimePicker value={checkStart} onChange={setCheckStart} />
            <span className="text-md text-ink-subtle">Đến</span>
            <TimePicker value={checkEnd} onChange={setCheckEnd} />
          </div>

          {error && <span className="text-md text-danger">{error}</span>}
        </div>

        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
          <button className="kv-btn kv-btn-primary h-10" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShiftTemplateModal
