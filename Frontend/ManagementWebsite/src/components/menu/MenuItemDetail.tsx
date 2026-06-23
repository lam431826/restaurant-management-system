import { useState } from 'react'
import type { MenuItem } from '../../services/menuService'
import { assetUrl } from '../../services/api'

interface Props {
  item: MenuItem
  categoryName: string
  onEdit: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}

const TABS = ['Thông tin', 'Mô tả, ghi chú'] as const
type Tab = (typeof TABS)[number]

const formatVnd = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('vi-VN')

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1 pb-3 border-b border-line">
    <span className="text-sm text-ink-subtle">{label}</span>
    <span className="text-md text-ink">{children}</span>
  </div>
)

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const BanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const MenuItemDetail = ({ item, categoryName, onEdit, onToggleAvailability, onDelete }: Props) => {
  const [tab, setTab] = useState<Tab>('Thông tin')

  const profit = item.costPrice != null ? item.price - item.costPrice : null
  const costRatio = item.costPrice != null && item.price > 0
    ? ((item.costPrice / item.price) * 100).toFixed(1) + '%'
    : '—'

  return (
    <div className="bg-card border-t border-line">
      {/* Tabs */}
      <div className="flex items-center gap-8 px-6 border-b border-line">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative h-11 text-md font-semibold cursor-pointer transition-colors ${tab === t ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[0.2rem] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'Thông tin' && (
          <div className="flex flex-col gap-6">
            {/* Header: image + name + tags */}
            <div className="flex items-start gap-4">
              {item.imageUrl
                ? <img src={assetUrl(item.imageUrl)} alt="" className="w-24 h-24 rounded-lg object-cover border border-line shrink-0" />
                : <div className="w-24 h-24 rounded-lg bg-fill border border-line shrink-0" />}
              <div className="flex flex-col gap-2 min-w-0">
                <h3 className="text-h3 font-bold text-ink">{item.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.itemType && (
                    <span className="inline-flex items-center text-sm text-ink-subtle border border-line-default rounded-md px-2 py-0.5">{item.itemType}</span>
                  )}
                  {item.tag && (
                    <span className="inline-flex items-center text-sm text-warning font-medium border border-warning/40 rounded-md px-2 py-0.5">{item.tag}</span>
                  )}
                  <span className={`inline-flex items-center text-sm font-medium rounded-full px-2 py-0.5 ${item.available ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-700'}`}>
                    {item.available ? 'Đang bán' : 'Hết hàng'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-ink-subtle mt-1">
                  <span>Lợi nhuận dự kiến: <span className="text-ink font-semibold">{formatVnd(profit)}</span></span>
                  <span className="w-px h-4 bg-line" />
                  <span>Tỷ lệ giá vốn: <span className="text-ink font-semibold">{costRatio}</span></span>
                </div>
              </div>
            </div>

            {/* Fields grid (tax & warehouse fields intentionally omitted) */}
            <div className="grid grid-cols-4 gap-x-8 gap-y-4">
              <Field label="Mã món">{item.code || '—'}</Field>
              <Field label="Nhóm món">{categoryName || '—'}</Field>
              <Field label="Loại thực đơn">{item.menuType || '—'}</Field>
              <Field label="Giá vốn">{formatVnd(item.costPrice)}</Field>
              <Field label="Giá bán">{formatVnd(item.price)}</Field>
              <Field label="Loại món">{item.itemType || '—'}</Field>
              <Field label="Tag món">{item.tag || '—'}</Field>
              <Field label="Trạng thái">{item.available ? 'Đang bán' : 'Hết hàng'}</Field>
            </div>
          </div>
        )}

        {tab === 'Mô tả, ghi chú' && (
          <div className="text-md text-ink whitespace-pre-wrap min-h-[3rem]">
            {item.description?.trim() || <span className="text-ink-muted">Chưa có mô tả.</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-line">
        <button className="kv-btn kv-btn-outline-neutral h-10 text-danger" onClick={() => onDelete(item)}>
          <TrashIcon /> Xóa
        </button>
        <div className="flex items-center gap-2">
          <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => onToggleAvailability(item)}>
            <BanIcon /> {item.available ? 'Ngừng bán' : 'Mở bán'}
          </button>
          <button className="kv-btn kv-btn-primary h-10" onClick={() => onEdit(item)}>
            <EditIcon /> Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuItemDetail
