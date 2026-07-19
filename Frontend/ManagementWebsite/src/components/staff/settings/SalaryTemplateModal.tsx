import { useEffect, useRef, useState } from 'react'
import type { SalaryTemplateDto, SalaryTemplatePayload } from '../../../api/salaryTemplates'
import { createSalaryTemplate, updateSalaryTemplate } from '../../../api/salaryTemplates'
import {
  Field, Picker, SectionCard, ShiftSalaryBody, inputCls,
  salaryTypes, LABEL_TO_SALARY_TYPE, SALARY_TYPE_TO_LABEL, parseRates, defaultSalaryConfig,
} from '../EmployeeModal'
import type { SalaryConfig, OtRates } from '../EmployeeModal'

interface Props {
  template?: SalaryTemplateDto | null
  onClose: () => void
  onSaved: () => void
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const SalaryTemplateModal = ({ template, onClose, onSaved }: Props) => {
  const [name, setName] = useState(template?.name ?? '')
  const [salaryType, setSalaryType] = useState(template ? SALARY_TYPE_TO_LABEL[template.mainSalaryType] : '')
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(() => template ? {
    base: String(template.mainBaseWage ?? 0),
    def: parseRates(template.mainAdvancedRatesJson) ?? defaultSalaryConfig().def,
    overtimeEnabled: template.overtimeEnabled,
    ot: (parseRates(template.overtimeRatesJson) as OtRates | null) ?? defaultSalaryConfig().ot,
  } : defaultSalaryConfig())
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
      setError('Vui lòng nhập tên mẫu lương')
      nameRef.current?.focus()
      return
    }
    if (!salaryType) {
      setError('Vui lòng chọn loại lương')
      return
    }
    const payload: SalaryTemplatePayload = {
      name: name.trim(),
      mainSalaryType: LABEL_TO_SALARY_TYPE[salaryType],
      mainBaseWage: parseInt(salaryConfig.base.replace(/\D/g, '') || '0', 10),
      mainAdvancedRatesJson: JSON.stringify(salaryConfig.def),
      // BR-PAY-05: overtime only applies to shift-based main salary
      overtimeEnabled: salaryType === 'Theo ca làm việc' && salaryConfig.overtimeEnabled,
      overtimeRatesJson: JSON.stringify(salaryConfig.ot),
    }
    setSaving(true)
    setError('')
    try {
      if (template) await updateSalaryTemplate(template.id, payload)
      else await createSalaryTemplate(payload)
      onSaved()
    } catch (err) {
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (anyErr.response?.status === 409) setError('Tên mẫu lương đã tồn tại')
      else setError(anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[70rem] my-[6vh] bg-surface rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 bg-card rounded-t-lg border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{template ? 'Sửa mẫu lương' : 'Thêm mẫu lương'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <SectionCard>
            <Field label="Tên mẫu">
              <input
                ref={nameRef}
                className={inputCls}
                placeholder="Bắt buộc"
                value={name}
                onChange={e => { setName(e.target.value); if (error) setError('') }}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Lương chính">
            <div className="flex items-center gap-4 mt-3">
              <label className="text-md text-ink-subtle w-[8rem] shrink-0">Loại lương</label>
              <div className="w-full sm:w-[40rem]">
                <Picker value={salaryType} options={salaryTypes} placeholder="Chọn Loại lương" onChange={v => { setSalaryType(v); if (error) setError('') }} />
              </div>
              <InfoIcon />
            </div>
            {salaryType === 'Theo ca làm việc' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} />}
            {salaryType === 'Theo giờ làm việc' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} suffix="/ Giờ" firstCol="Mức lương" wageCol="Lương/giờ" showOvertime={false} />}
            {salaryType === 'Cố định' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} suffix="/ kỳ lương" showOvertime={false} noAdvanced />}
          </SectionCard>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-card rounded-b-lg border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={saving}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={() => void handleSave()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalaryTemplateModal
