export type AreaFilter = 'all' | string
export type StatusFilter = 'active' | 'inactive' | 'all'

interface Props {
  areas: string[]
  area: AreaFilter
  status: StatusFilter
  onArea: (v: AreaFilter) => void
  onStatus: (v: StatusFilter) => void
  onCreateArea: () => void
}

const RoomFilters = ({ areas, area, status, onArea, onStatus, onCreateArea }: Props) => (
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
          <label key={a} className="kv-radio">
            <input type="radio" name="room-area" checked={area === a} onChange={() => onArea(a)} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{a}</span>
          </label>
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
