import { useRef } from 'react'
import type { Room } from '../../data/mockData'

interface Props {
  search: string
  onSearch: (v: string) => void
  onAdd: () => void
  rooms: Room[]
}

const iconBtn = 'w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary'

const exportCsv = (rooms: Room[]) => {
  const header = ['Tên phòng/bàn', 'Ghi chú', 'Khu vực', 'Số ghế', 'Trạng thái', 'Số thứ tự']
  const rows = rooms.map(r => [r.name, r.note, r.area, r.seats, r.active ? 'Đang hoạt động' : 'Ngừng hoạt động', r.order])
  const csv = [header, ...rows]
    .map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `phong-ban-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const RoomToolbar = ({ search, onSearch, onAdd, rooms }: Props) => {
  const importRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 relative flex items-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-ink-muted pointer-events-none">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full h-12 pl-[4.4rem] pr-12 bg-card border border-line rounded-full text-md text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]"
          placeholder="Theo tên phòng bàn, số ghế"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        <button className="absolute right-3 text-ink-muted cursor-pointer transition-colors hover:text-primary" aria-label="Bộ lọc" title="Bộ lọc nâng cao">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className="kv-btn kv-btn-primary h-10" onClick={onAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm phòng/bàn
        </button>

        <input
          ref={importRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) window.alert(`Đã chọn tệp nhập: ${f.name}`)
            e.target.value = ''
          }}
        />
        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => importRef.current?.click()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
        </button>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => exportCsv(rooms)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Xuất file
        </button>

        <button
          className="kv-btn kv-btn-outline-neutral h-10 bg-card"
          onClick={() => window.alert(`Đang tải mã QR cho ${rooms.length} phòng/bàn...`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Tải tất cả mã QR
        </button>

        <button className={iconBtn} aria-label="Trợ giúp" title="Trợ giúp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default RoomToolbar
