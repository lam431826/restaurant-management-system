import { Fragment, useState } from 'react'
import type { MenuItem } from '../../services/menuService'
import { assetUrl } from '../../services/api'
import MenuItemDetail from './MenuItemDetail'

const Star = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'var(--kv-warning)' : 'none'} stroke={filled ? 'var(--kv-warning)' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

interface Props {
  items: MenuItem[]
  loading: boolean
  categoryNames: Map<string, string>
  total: number
  page: number
  totalPages: number
  onPage: (p: number) => void
  onEdit: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
}

const MenuTable = ({
  items, loading, categoryNames, total, page, totalPages, onPage, onEdit, onToggleAvailability, onDelete,
  selected, onToggleSelect, onToggleAll,
}: Props) => {
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allSelected = items.length > 0 && items.every(p => selected.has(p.id))

  const toggleStar = (id: string) =>
    setStarred(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className={`${th} w-[4.5rem] text-center`}>
                <label className="kv-check justify-center">
                  <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
                  <span className="kv-check-box" />
                </label>
              </th>
              <th className={`${th} w-[4rem] text-center`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-45 inline">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </th>
              <th className={`${th} w-[5.5rem]`} />
              <th className={`${th} w-[10rem]`}>Mã món</th>
              <th className={th}>Tên món</th>
              <th className={`${th} w-[15rem]`}>Nhóm món</th>
              <th className={`${th} w-[12rem]`}>Loại món</th>
              <th className={`${th} w-[10rem] text-right`}>Giá bán</th>
              <th className={`${th} w-[10rem] text-center`}>Trạng thái</th>
              <th className={`${th} w-[10rem] text-center`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <Fragment key={p.id}>
              <tr
                className={`cursor-pointer ${expandedId === p.id ? 'bg-primary-50' : selected.has(p.id) ? 'bg-primary-50' : 'hover:bg-primary-25'}`}
                onClick={() => setExpandedId(id => (id === p.id ? null : p.id))}
              >
                <td className={`${td} text-center`} onClick={e => e.stopPropagation()}>
                  <label className="kv-check justify-center">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => onToggleSelect(p.id)} />
                    <span className="kv-check-box" />
                  </label>
                </td>
                <td className={`${td} text-center`} onClick={e => e.stopPropagation()}>
                  <button
                    className="inline-flex items-center justify-center text-ink-muted cursor-pointer hover:text-warning"
                    onClick={() => toggleStar(p.id)}
                    aria-label="Đánh dấu"
                  >
                    <Star filled={starred.has(p.id)} />
                  </button>
                </td>
                <td className={td}>
                  {p.imageUrl
                    ? <img src={assetUrl(p.imageUrl)} alt="" className="w-10 h-10 rounded-sm object-cover border border-line" loading="lazy" />
                    : <div className="w-10 h-10 rounded-sm bg-fill border border-line" />}
                </td>
                <td className={`${td} text-primary font-medium truncate`}>{p.code || '—'}</td>
                <td className={`${td} truncate`}>{p.name}</td>
                <td className={`${td} truncate`}>{categoryNames.get(p.categoryId) ?? '—'}</td>
                <td className={td}>
                  {p.itemType
                    ? <span className="inline-flex items-center text-sm text-ink-subtle border border-line-default rounded-xxs px-2 py-[0.2rem] whitespace-nowrap">{p.itemType}</span>
                    : '—'}
                </td>
                <td className={`${td} text-right`}>{p.price.toLocaleString('vi-VN')}</td>
                <td className={`${td} text-center`}>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${p.available ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'}`}>
                    {p.available ? 'Đang bán' : 'Hết hàng'}
                  </span>
                </td>
                <td className={`${td} text-center`} onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() => onToggleAvailability(p)}
                      title={p.available ? 'Đánh dấu hết hàng' : 'Mở bán lại'}
                    >
                      {p.available ? 'Ngừng bán' : 'Mở bán'}
                    </button>
                    <button className="text-sm text-danger hover:underline" onClick={() => onDelete(p)}>Xóa</button>
                  </div>
                </td>
              </tr>
              {expandedId === p.id && (
                <tr>
                  <td colSpan={10} className="p-0 border-b border-line" onClick={e => e.stopPropagation()}>
                    <MenuItemDetail
                      item={p}
                      categoryName={categoryNames.get(p.categoryId) ?? ''}
                      onEdit={onEdit}
                      onToggleAvailability={onToggleAvailability}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <div className="text-lg font-semibold text-ink-strong">Không có món nào.</div>
            <div className="text-md text-ink-subtle">Thử đổi từ khóa tìm kiếm hoặc bộ lọc.</div>
          </div>
        )}
        {loading && <div className="flex items-center justify-center py-20 text-md text-ink-subtle">Đang tải…</div>}
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">Tổng số {total} món</span>
        <div className="flex items-center gap-2">
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="text-md text-ink-subtle">Trang {page} / {totalPages}</span>
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

export default MenuTable
