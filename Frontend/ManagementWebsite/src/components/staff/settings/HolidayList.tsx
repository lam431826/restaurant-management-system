import { useState } from 'react'
import type { PayrollHolidayDto } from '../../../api/payrollHolidays'
import { deletePayrollHoliday } from '../../../api/payrollHolidays'
import HolidayModal from './HolidayModal'

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
)
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)

/** ISO date "2026-08-01" → "01/08/2026" */
const fmtDMY = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

const HolidayList = ({ holidays, onBack, onChanged }: { holidays: PayrollHolidayDto[]; onBack: () => void; onChanged: () => void }) => {
  const [modal, setModal] = useState<{ holiday: PayrollHolidayDto | null } | null>(null)
  const [error, setError] = useState('')

  const remove = async (h: PayrollHolidayDto) => {
    try {
      await deletePayrollHoliday(h.id)
      onChanged()
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      setError(anyErr.response?.data?.message || 'Không thể xóa ngày lễ.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-lg font-bold text-ink cursor-pointer hover:text-primary">
          <ChevronLeft /> Danh sách Ngày lễ, Tết
        </button>
        <button onClick={() => setModal({ holiday: null })} className="kv-btn kv-btn-outline-primary h-10">
          <span className="text-lg leading-none">+</span> Thêm ngày lễ
        </button>
      </div>

      {error && <div className="mb-3 px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-fill text-sm font-semibold text-ink-subtle">
            <th className="text-left px-4 py-3 w-[4rem]">STT</th>
            <th className="text-left px-4 py-3">Tên ngày lễ</th>
            <th className="text-left px-4 py-3">Ngày</th>
            <th className="text-right px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {holidays.map((h, i) => (
            <tr key={h.id} className="border-b border-line">
              <td className="px-4 py-4 text-md text-ink">{i + 1}</td>
              <td className="px-4 py-4 text-md text-ink">{h.name}</td>
              <td className="px-4 py-4 text-md text-ink">{fmtDMY(h.holidayDate)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-4 text-ink-muted">
                  <button onClick={() => setModal({ holiday: h })} className="hover:text-primary cursor-pointer" aria-label="Sửa"><PencilIcon /></button>
                  <button onClick={() => remove(h)} className="hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                </div>
              </td>
            </tr>
          ))}
          {holidays.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-md text-ink-subtle">Chưa có ngày lễ nào</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <HolidayModal
          holiday={modal.holiday}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onChanged() }}
        />
      )}
    </div>
  )
}

export default HolidayList
