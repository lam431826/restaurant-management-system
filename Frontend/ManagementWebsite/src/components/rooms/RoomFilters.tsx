import type { TableArea } from '../../services/tableService'

export type AreaFilter = 'all' | string
export type StatusFilter = 'active' | 'inactive' | 'all'

interface Props {
  areas: TableArea[]
  area: AreaFilter
  status: StatusFilter
  onArea: (v: AreaFilter) => void
  onStatus: (v: StatusFilter) => void
  onCreateArea: () => void
  onDeleteArea: (a: TableArea) => void
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const RoomFilters = ({ areas, area, status, onArea, onStatus, onCreateArea, onDeleteArea }: Props) => (
  <div className="flex flex-col gap-6">
    {/* Khu vực */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-md font-semibold text-ink">
        <span>Khu vực</span>
        <button className="text-sm font-medium text-primary cursor-pointer hover:underline" onClick={onCreateArea}>
          Tạo mới
        </button>
      </div>
      <div className="flex flex-col gap-1.5 mt-1">
        <label className="kv-radio">
          <input type="radio" name="room-area" checked={area === 'all'} onChange={() => onArea('all')} />
          <span className="kv-radio-dot" />
          <span className="kv-radio-text">Tất cả</span>
        </label>
        {areas.map(a => (
          <div key={a.id} className="flex items-center gap-1">
            <label className="kv-radio flex-1 min-w-0">
              <input type="radio" name="room-area" checked={area === a.name} onChange={() => onArea(a.name)} />
              <span className="kv-radio-dot" />
              <span className="kv-radio-text truncate">{a.name}</span>
            </label>
            <button
              type="button"
              onClick={() => onDeleteArea(a)}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-ink-muted cursor-pointer transition-colors hover:text-danger hover:bg-danger-50"
              aria-label={`Xóa khu vực ${a.name}`}
              title="Xóa khu vực"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Trạng thái */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Trạng thái</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {([['active', 'Đang hoạt động'], ['inactive', 'Ngừng hoạt động'], ['all', 'Tất cả']] as const).map(
          ([id, label]) => (
            <label key={id} className="kv-radio">
              <input type="radio" name="room-status" checked={status === id} onChange={() => onStatus(id)} />
              <span className="kv-radio-dot" />
              <span className="kv-radio-text">{label}</span>
            </label>
          )
        )}
      </div>
    </div>
  </div>
)

export default RoomFilters
