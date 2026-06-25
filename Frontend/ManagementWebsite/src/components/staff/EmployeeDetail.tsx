import { useEffect, useState } from 'react'
import type { Employee } from '../../data/mockData'
import Avatar from '../common/Avatar'

interface Props {
  employee: Employee
  departments: string[]
  positions: string[]
  branches: string[]
  onSave: (updated: Employee) => void
  onToggleActive: (employee: Employee) => void
}

const TABS = ['Thông tin', 'Lịch làm việc', 'Thiết lập lương', 'Phiếu lương', 'Nợ và tạm ứng'] as const
type Tab = (typeof TABS)[number]

const WarningIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning shrink-0">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="9" y1="9" x2="9" y2="15" /><line x1="15" y1="9" x2="15" y2="15" />
  </svg>
)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
  </svg>
)
const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
)
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const fieldCls =
  'w-full bg-transparent border-0 border-b border-line text-md text-ink py-1 transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

const Field = ({
  label, warning, children,
}: { label: string; warning?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="flex items-center gap-1.5 text-sm text-ink-subtle">
      {label}
      {warning && <WarningIcon />}
    </span>
    {children}
  </div>
)

const EmployeeDetail = ({ employee, departments, positions, branches, onSave, onToggleActive }: Props) => {
  const [tab, setTab] = useState<Tab>('Thông tin')
  const [draft, setDraft] = useState(employee)

  useEffect(() => setDraft(employee), [employee])

  const set = <K extends keyof Employee>(key: K, value: Employee[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  return (
    <div className="bg-card border-t border-line">
      <div className="flex items-center gap-8 px-6 border-b border-line overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative h-11 text-md font-semibold cursor-pointer whitespace-nowrap transition-colors ${tab === t ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[0.2rem] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'Thông tin' ? (
        <>
          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="w-20 h-20" />
              <div>
                <h3 className="text-h3 font-bold text-ink">{draft.name}</h3>
                <p className="text-md text-ink-subtle">Mã nhân viên: {draft.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-10 gap-y-5">
              <Field label="Số điện thoại" warning={!draft.phoneVerified}>
                <input className={fieldCls} value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="Nhập số điện thoại" />
              </Field>
              <Field label="Chi nhánh trả lương">
                <select className={fieldCls} value={draft.branchPay} onChange={e => set('branchPay', e.target.value)}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Chi nhánh làm việc">
                <select className={fieldCls} value={draft.branchWork} onChange={e => set('branchWork', e.target.value)}>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="Phòng ban">
                <select className={fieldCls} value={draft.department} onChange={e => set('department', e.target.value)}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Chức danh">
                <select className={fieldCls} value={draft.position} onChange={e => set('position', e.target.value)}>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Tài khoản">
                <input className={fieldCls} value={draft.account} onChange={e => set('account', e.target.value)} placeholder="Chưa liên kết" />
              </Field>

              <Field label="Số CMND/CCCD">
                <input className={fieldCls} value={draft.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="Nhập số CMND/CCCD" />
              </Field>
              <Field label="Ngày sinh">
                <input type="date" className={fieldCls} value={draft.birthday} onChange={e => set('birthday', e.target.value)} />
              </Field>
              <Field label="Giới tính">
                <select className={fieldCls} value={draft.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </Field>

              <Field label="Địa chỉ">
                <input className={fieldCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Nhập địa chỉ" />
              </Field>
              <Field label="Email">
                <input type="email" className={fieldCls} value={draft.email} onChange={e => set('email', e.target.value)} placeholder="Nhập email" />
              </Field>
              <Field label="Facebook">
                <input className={fieldCls} value={draft.facebook} onChange={e => set('facebook', e.target.value)} placeholder="Nhập Facebook" />
              </Field>

              <Field label="Ngày bắt đầu làm việc">
                <input type="date" className={fieldCls} value={draft.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="Mã chấm công">
                <input className={fieldCls} value={draft.timekeepCode} onChange={e => set('timekeepCode', e.target.value)} placeholder="Nhập mã chấm công" />
              </Field>
              <Field label="Thiết bị di động">
                <input className={fieldCls} value={draft.mobileDevice} onChange={e => set('mobileDevice', e.target.value)} placeholder="Chưa đăng ký" />
              </Field>
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm text-ink-subtle"><PencilIcon /> Ghi chú:</span>
              <textarea
                className={`${fieldCls} h-[5rem] resize-none`}
                value={draft.note}
                onChange={e => set('note', e.target.value)}
                placeholder="Nhập ghi chú"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-line">
            <button className="kv-btn kv-btn-outline-neutral h-10 text-danger" onClick={() => onToggleActive(draft)}>
              {draft.active ? <PauseIcon /> : <PlayIcon />} {draft.active ? 'Ngừng làm việc' : 'Cho phép làm việc'}
            </button>
            <div className="flex items-center gap-2">
              <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => window.alert(`Đã gửi mã xác nhận cho ${draft.name}.`)}>
                <KeyIcon /> Lấy mã xác nhận
              </button>
              <button className="kv-btn kv-btn-primary h-10" onClick={() => onSave(draft)}>Cập nhật</button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-16 text-md text-ink-subtle">
          {tab} đang được phát triển
        </div>
      )}
    </div>
  )
}

export default EmployeeDetail
