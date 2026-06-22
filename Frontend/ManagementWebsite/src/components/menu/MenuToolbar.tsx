import { useRef } from 'react'
import type { Product } from '../../data/mockData'
import type { NewItemKind } from './AddItemModal'
import NewItemMenu from './NewItemMenu'

interface Props {
  search: string
  onSearch: (v: string) => void
  onNew: (kind: NewItemKind) => void
  products: Product[]
}

const iconBtn = 'w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary'

const exportCsv = (products: Product[]) => {
  const header = ['Mã món', 'Tên món', 'Nhóm món', 'Loại thực đơn', 'Loại món', 'Giá bán']
  const rows = products.map(p => [p.code, p.name, p.group, p.menuType, p.itemType, p.price])
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `danh-sach-mon-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const MenuToolbar = ({ search, onSearch, onNew, products }: Props) => {
  const importRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0 relative flex items-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-ink-muted pointer-events-none">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full h-12 pl-[4.4rem] pr-4 bg-card border border-line rounded-full text-md text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]"
          placeholder="Theo mã hoặc tên món"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NewItemMenu onSelect={onNew} />

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

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => exportCsv(products)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Xuất file
        </button>

        <button className={iconBtn} aria-label="Tùy chọn hiển thị" title="Tùy chọn hiển thị cột">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        <button className={iconBtn} aria-label="Trợ giúp" title="Trợ giúp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        <button className={iconBtn} aria-label="Thiết lập" title="Thiết lập">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MenuToolbar
