import { useEffect, useRef, useState } from 'react'
import type { PayrollHolidayDto, PayrollHolidayPayload } from '../../../api/payrollHolidays'
import { createPayrollHoliday, updatePayrollHoliday } from '../../../api/payrollHolidays'

interface Props {
  holiday?: PayrollHolidayDto | null
  onClose: () => void
  onSaved: () => void
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const HolidayModal = ({ holiday, onClose, onSaved }: Props) => {
  const [name, setName] = useState(holiday?.name ?? '')
  const [date, setDate] = useState(holiday?.holidayDate ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên ngày lễ')
      nameRef.current?.focus()
      return
    }
    if (!date) {
      setError('Vui lòng chọn ngày')
      return
    }
    const payload: PayrollHolidayPayload = { name: name.trim(), holidayDate: date }
    setSaving(true)
    setError('')
    try {
      if (holiday) await updatePayrollHoliday(holiday.id, payload)
      else await createPayrollHoliday(payload)
      onSaved()
    } catch (err) {
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (anyErr.response?.status === 409) setError('Ngày lễ này đã tồn tại')
      else setError(anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-4"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[36rem] bg-card rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-h3 font-bold text-ink">{holiday ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-3">
          <label className="text-md text-ink">Tên ngày lễ</label>
          <input
            ref={nameRef}
            className="w-full h-11 px-3 bg-field border border-line-default rounded-md text-md text-ink outline-none focus:border-primary"
            placeholder="VD: Tết Nguyên Đán - Mùng 1"
            value={name}
            onChange={e => { setName(e.target.value); if (error) setError('') }}
          />
          <label className="text-md text-ink">Ngày</label>
          <input
            type="date"
            className="w-full h-11 px-3 bg-field border border-line-default rounded-md text-md text-ink outline-none focus:border-primary"
            value={date}
            onChange={e => { setDate(e.target.value); if (error) setError('') }}
          />
          {error && <span className="text-md text-danger">{error}</span>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line mt-4">
          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onClose}>Bỏ qua</button>
          <button className="kv-btn kv-btn-primary h-10" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HolidayModal
