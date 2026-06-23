import { Fragment, useState } from 'react'
import type { TableItem } from '../../services/tableService'
import RoomDetail from './RoomDetail'

interface Props {
  rooms: TableItem[]
  total: number
  loading: boolean
  onViewQr: (room: TableItem) => void
  onEdit: (room: TableItem) => void
  onToggleActive: (room: TableItem) => void
  onDelete: (room: TableItem) => void
}

const PAGE_SIZE = 15

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-4 py-3 border-b border-line align-middle'

const RoomTable = ({ rooms, total, loading, onViewQr, onEdit, onToggleActive, onDelete }: Props) => {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(rooms.length / PAGE_SIZE))
  // Clamp during render so the page stays valid when the filtered set shrinks
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * PAGE_SIZE
  const visible = rooms.slice(start, start + PAGE_SIZE)
  const from = rooms.length === 0 ? 0 : start + 1
  const to = Math.min(start + PAGE_SIZE, rooms.length)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className={th}>Tên phòng/bàn</th>
              <th className={th}>Ghi chú</th>
              <th className={`${th} w-[18rem]`}>Khu vực</th>
              <th className={`${th} w-[10rem]`}>Số ghế</th>
              <th className={`${th} w-[16rem]`}>Trạng thái</th>
              <th className={`${th} w-[11rem]`}>Số thứ tự</th>
              <th className={`${th} w-[13rem]`}>Xem mã QR</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className={`${td} text-center text-ink-muted`} colSpan={7}>
                  {loading ? 'Đang tải…' : 'Không tìm thấy phòng/bàn nào'}
                </td>
              </tr>
            ) : (
              visible.map(r => (
                <Fragment key={r.id}>
                  <tr
                    className={`cursor-pointer ${expandedId === r.id ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                    onClick={() => setExpandedId(id => (id === r.id ? null : r.id))}
                  >
                    <td className={td}>{r.name}</td>
                    <td className={`${td} text-ink-muted`}>{r.note || ''}</td>
                    <td className={td}>{r.area}</td>
                    <td className={td}>{r.seats}</td>
                    <td className={td}>
                      {r.active ? (
                        <span className="text-ink">Đang hoạt động</span>
                      ) : (
                        <span className="text-ink-muted">Ngừng hoạt động</span>
                      )}
                    </td>
                    <td className={td}>{r.order}</td>
                    <td className={td}>
                      <button
                        className="text-primary cursor-pointer hover:underline"
                        onClick={e => { e.stopPropagation(); onViewQr(r) }}
                      >
                        Xem mã QR
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-line" onClick={e => e.stopPropagation()}>
                        <RoomDetail
                          room={r}
                          onEdit={onEdit}
                          onToggleActive={onToggleActive}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">
          Hiển thị {from} - {to} trên tổng số {total}
        </span>
        <div className="flex gap-1">
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line-default disabled:hover:text-ink-subtle"
            disabled={safePage <= 1}
            onClick={() => setPage(Math.max(1, safePage - 1))}
            aria-label="Trang trước"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line-default disabled:hover:text-ink-subtle"
            disabled={safePage >= pageCount}
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
            aria-label="Trang sau"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomTable
