import { Fragment, useState } from 'react'
import type { TableItem } from '../../services/tableService'
import RoomDetail from './RoomDetail'

type SortDir = 'asc' | 'desc' | null

interface Props {
  rooms: TableItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onPage: (page: number) => void
  loading: boolean
  sortDir: SortDir
  onSortByName: () => void
  onViewQr: (room: TableItem) => void
  onEdit: (room: TableItem) => void
  onToggleActive: (room: TableItem) => void
  onDelete: (room: TableItem) => void
}

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-4 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-4 py-3 border-b border-line align-middle'

const SortArrow = ({ active, dir }: { active: boolean; dir: SortDir }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
    className={`inline shrink-0 transition-transform ${active ? 'text-primary' : 'opacity-35'} ${active && dir === 'desc' ? 'rotate-180' : ''}`}>
    <path d="M8 3v10M4.5 6.5L8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const RoomTable = ({ rooms, total, page, pageSize, totalPages, onPage, loading, sortDir, onSortByName, onViewQr, onEdit, onToggleActive, onDelete }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = from === 0 ? 0 : from + rooms.length - 1

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className={th}>
                <button className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-primary" onClick={onSortByName}>
                  Tên phòng/bàn <SortArrow active={sortDir !== null} dir={sortDir} />
                </button>
              </th>
              <th className={th}>Ghi chú</th>
              <th className={`${th} w-[18rem]`}>Khu vực</th>
              <th className={`${th} w-[10rem]`}>Số ghế</th>
              <th className={`${th} w-[16rem]`}>Trạng thái</th>
              <th className={`${th} w-[13rem]`}>Xem mã QR</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td className={`${td} text-center text-ink-muted`} colSpan={6}>
                  {loading ? 'Đang tải…' : 'Không tìm thấy phòng/bàn nào'}
                </td>
              </tr>
            ) : (
              rooms.map(r => (
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
                      <td colSpan={6} className="p-0 border-b border-line" onClick={e => e.stopPropagation()}>
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
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line-default disabled:hover:text-ink-subtle"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
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
