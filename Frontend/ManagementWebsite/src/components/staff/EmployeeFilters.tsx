export type EmpStatus = 'active' | 'inactive'

interface Props {
  status: EmpStatus
  onStatus: (v: EmpStatus) => void
}

const EmployeeFilters = ({ status, onStatus }: Props) => (
  <div className="flex flex-col gap-6">
    {/* Trạng thái */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Trạng thái</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {([['active', 'Đang làm việc'], ['inactive', 'Đã nghỉ']] as const).map(([id, label]) => (
          <label key={id} className="kv-radio">
            <input type="radio" name="emp-status" checked={status === id} onChange={() => onStatus(id)} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{label}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
)

export default EmployeeFilters
