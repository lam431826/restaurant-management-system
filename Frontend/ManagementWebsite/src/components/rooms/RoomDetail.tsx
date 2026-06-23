import type { TableItem } from '../../services/tableService'

interface Props {
  room: TableItem
  onEdit: (room: TableItem) => void
  onToggleActive: (room: TableItem) => void
  onDelete: (room: TableItem) => void
}

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const ReadOnlyField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1 pb-2 border-b border-line">
    <span className="text-sm text-ink-subtle">{label}</span>
    <span className="text-md text-ink">{value}</span>
  </div>
)

const RoomDetail = ({ room, onEdit, onToggleActive, onDelete }: Props) => (
  <div className="bg-card border-t border-line p-6 flex flex-col gap-6">
    {/* Header */}
    <div className="flex items-center gap-3">
      <h3 className="text-h3 font-bold text-ink">{room.name}</h3>
      <span className={`inline-flex items-center text-sm font-medium rounded-full px-2 py-0.5 ${room.active ? 'bg-primary-50 text-primary-700' : 'bg-fill text-ink-muted'}`}>
        {room.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
      </span>
    </div>

    {/* Info */}
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      <ReadOnlyField label="Số ghế" value={room.seats > 0 ? room.seats : <span className="text-ink-muted">Chưa có</span>} />
      <ReadOnlyField label="Khu vực" value={room.area || <span className="text-ink-muted">Chưa có</span>} />
      <ReadOnlyField label="Số thứ tự" value={room.order} />
      <ReadOnlyField label="Ghi chú" value={room.note || <span className="text-ink-muted">Chưa có</span>} />
    </div>

    {/* Transaction history */}
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-line">
        <h4 className="text-md font-bold text-ink">Lịch sử giao dịch</h4>
      </div>
      <div className="px-4 py-8 text-center text-md text-ink-muted">
        Chưa có giao dịch cho phòng/bàn này.
      </div>
    </div>

    {/* Actions */}
    <div className="flex items-center justify-between gap-3">
      <button className="kv-btn kv-btn-outline-neutral h-10 text-danger" onClick={() => onDelete(room)}>
        <TrashIcon /> Xóa
      </button>
      <div className="flex items-center gap-2">
        <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => onToggleActive(room)}>
          <LockIcon /> {room.active ? 'Ngừng hoạt động' : 'Mở hoạt động'}
        </button>
        <button className="kv-btn kv-btn-primary h-10" onClick={() => onEdit(room)}>
          <EditIcon /> Chỉnh sửa
        </button>
      </div>
    </div>
  </div>
)

export default RoomDetail
