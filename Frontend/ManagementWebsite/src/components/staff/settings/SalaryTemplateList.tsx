import { useState } from 'react'
import type { SalaryTemplateDto } from '../../../api/salaryTemplates'
import { deleteSalaryTemplate } from '../../../api/salaryTemplates'
import { SALARY_TYPE_LABEL } from '../../../api/payroll'
import SalaryTemplateModal from './SalaryTemplateModal'

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
)
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)

const fmtVnd = (n: number) => n.toLocaleString('en-US')

const SalaryTemplateList = ({ templates, onBack, onChanged }: { templates: SalaryTemplateDto[]; onBack: () => void; onChanged: () => void }) => {
  const [modal, setModal] = useState<{ template: SalaryTemplateDto | null } | null>(null)
  const [error, setError] = useState('')

  const remove = async (t: SalaryTemplateDto) => {
    try {
      await deleteSalaryTemplate(t.id)
      onChanged()
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } } }
      setError(anyErr.response?.data?.message || 'Không thể xóa mẫu lương.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-lg font-bold text-ink cursor-pointer hover:text-primary">
          <ChevronLeft /> Danh sách Mẫu lương
        </button>
        <button onClick={() => setModal({ template: null })} className="kv-btn kv-btn-outline-primary h-10">
          <span className="text-lg leading-none">+</span> Thêm mẫu lương
        </button>
      </div>

      {error && <div className="mb-3 px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-fill text-sm font-semibold text-ink-subtle">
            <th className="text-left px-4 py-3 w-[4rem]">STT</th>
            <th className="text-left px-4 py-3">Tên mẫu</th>
            <th className="text-left px-4 py-3">Loại lương</th>
            <th className="text-left px-4 py-3">Lương cơ bản</th>
            <th className="text-right px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t, i) => (
            <tr key={t.id} className="border-b border-line">
              <td className="px-4 py-4 text-md text-ink">{i + 1}</td>
              <td className="px-4 py-4 text-md text-ink">{t.name}</td>
              <td className="px-4 py-4 text-md text-ink">{SALARY_TYPE_LABEL[t.mainSalaryType]}</td>
              <td className="px-4 py-4 text-md text-ink">{fmtVnd(t.mainBaseWage)}</td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-4 text-ink-muted">
                  <button onClick={() => setModal({ template: t })} className="hover:text-primary cursor-pointer" aria-label="Sửa"><PencilIcon /></button>
                  <button onClick={() => remove(t)} className="hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                </div>
              </td>
            </tr>
          ))}
          {templates.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-md text-ink-subtle">Chưa có mẫu lương nào</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <SalaryTemplateModal
          template={modal.template}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onChanged() }}
        />
      )}
    </div>
  )
}

export default SalaryTemplateList
