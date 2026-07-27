import type { Promotion } from '../../services/promotionApi'
import { Skeleton } from '../dashboard/DashboardStates'

interface Props {
  promotions: Promotion[]
  loading: boolean
  deletingId: string | null
  onEdit: (promotion: Promotion) => void
  onDeactivate: (promotion: Promotion) => void
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
// `td` deliberately carries no white-space rule: adding `whitespace-normal` on top of a
// shared `whitespace-nowrap` never worked (equal specificity, so Tailwind's stylesheet order
// decided and nowrap won), which silently forced the description column to its full
// single-line width and pushed the action buttons off-screen. Wrapping is now opt-out.
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'
const tdNoWrap = `${td} whitespace-nowrap`

const formatDate = (value: string | null) => {
  if (!value) return null
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Both dates in one cell: two nowrap date columns cost ~250px and always read as a pair. */
const formatPeriod = (promotion: Promotion) => {
  const from = formatDate(promotion.validFrom)
  const to = formatDate(promotion.validTo)
  if (!from && !to) return 'Không giới hạn'
  if (from && to) return `${from} – ${to}`
  return from ? `Từ ${from}` : `Đến ${to}`
}

const formatDiscount = (promotion: Promotion) => {
  if (promotion.discountPercent !== null) {
    return `${promotion.discountPercent.toLocaleString('vi-VN')}%`
  }
  return `${(promotion.discountAmount ?? 0).toLocaleString('vi-VN')} đ`
}

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </svg>
)

const DisableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" />
  </svg>
)

const PromotionTable = ({ promotions, loading, deletingId, onEdit, onDeactivate, page, totalPages, total, onPageChange }: Props) => (
  <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
    <div className="flex-1 min-h-0 overflow-auto">
      {/* Column set is deliberately compact so all 7 columns — including the action buttons —
          fit the pane without horizontal scrolling: Giới hạn/Đã dùng/Còn lại collapsed into one
          ratio column, and Từ ngày/Đến ngày into a single "Thời hạn" range.
          `code` and `description` are the only user-typed fields, so they are the only ones
          that can be pathologically long (a 50-char code is valid per the backend's @Size).
          Both are width-capped and clamped here so one bad row can never push the rest of the
          table off-screen — the full value stays available via the native title tooltip. */}
      <table className="w-full min-w-[64rem] border-collapse table-fixed">
        <thead>
          <tr>
            {/* Widths are sized to each column's real rendered content (root font-size is 10px,
                so 1rem = 10px). Under table-fixed a too-narrow nowrap column does not grow —
                its text spills and reintroduces horizontal scroll — so the date range and the
                action buttons get the width they actually measure, and the description column
                absorbs the remainder. */}
            <th className={`${th} w-[12rem]`}>Mã khuyến mãi</th>
            <th className={`${th} w-auto`}>Mô tả</th>
            <th className={`${th} w-[11rem]`}>Mức giảm</th>
            <th className={`${th} w-[19rem]`}>Thời hạn</th>
            <th className={`${th} w-[12rem]`}>Trạng thái</th>
            <th className={`${th} text-right w-[12rem]`}>Lượt sử dụng</th>
            {/* Sized for the widest state, not the idle one: while a row is deactivating the
                button label swaps "Ngừng" → "Đang xử lý", which is ~26px wider. 22rem keeps a
                real gutter at that width — at 20rem the busy group consumed the padding entirely
                and sat <1px from the pane edge, close enough that a font fallback would have
                reintroduced the horizontal scrollbar this column caused twice before. */}
            <th className={`${th} text-center w-[22rem]`}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {!loading && promotions.map(promotion => (
            <tr key={promotion.id} className="hover:bg-primary-25">
              <td className={`${td} text-primary font-semibold`}>
                <span className="block truncate" title={promotion.code}>{promotion.code}</span>
              </td>
              <td className={td}>
                {/* No `block` here: line-clamp-2 sets its own `display`, so adding a display
                    utility overrides it and silently disables the clamp (the same
                    equal-specificity trap that broke whitespace-normal above) — measured at
                    ~225px row height with `block` present versus 65px without it. */}
                <span className="line-clamp-2 break-words" title={promotion.description || undefined}>
                  {promotion.description || '—'}
                </span>
              </td>
              {/* A fixed discount can reach 999.999.999.999 đ (precision 12), so this is clipped
                  too — otherwise any amount from ~500.000 đ up overpaints the next column. */}
              <td className={`${tdNoWrap} font-medium`}>
                <span className="block truncate" title={formatDiscount(promotion)}>
                  {formatDiscount(promotion)}
                </span>
              </td>
              <td className={tdNoWrap}>{formatPeriod(promotion)}</td>
              <td className={tdNoWrap}>
                <span className={`kv-badge ${promotion.active ? 'kv-badge-success' : 'kv-badge-neutral'}`}>
                  {promotion.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
              </td>
              {/* usageLimit can legitimately reach 2,147,483,647, so this cell is clipped rather
                  than allowed to spill over the action buttons. Only the used/limit ratio is
                  shown — "còn N" never fit this column at any limit — and the tooltip carries
                  the full figures including the remaining count. */}
              <td className={`${tdNoWrap} text-right`}>
                <span
                  className="block truncate"
                  title={
                    promotion.usageLimit === null
                      ? `Đã dùng ${promotion.usedCount.toLocaleString('vi-VN')} · không giới hạn`
                      : `Đã dùng ${promotion.usedCount.toLocaleString('vi-VN')} / ${promotion.usageLimit.toLocaleString('vi-VN')}` +
                        (promotion.remainingUses !== null
                          ? ` · còn ${promotion.remainingUses.toLocaleString('vi-VN')}`
                          : '')
                  }
                >
                  <span className="font-semibold text-ink">{promotion.usedCount.toLocaleString('vi-VN')}</span>
                  <span className="text-ink-muted">
                    {promotion.usageLimit === null ? ' / ∞' : ` / ${promotion.usageLimit.toLocaleString('vi-VN')}`}
                  </span>
                </span>
              </td>
              <td className={`${tdNoWrap} text-center`}>
                <div className="inline-flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="kv-btn kv-btn-outline-primary h-8 px-2.5"
                    onClick={() => onEdit(promotion)}
                    title="Chỉnh sửa khuyến mãi"
                  >
                    <EditIcon />
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="kv-btn kv-btn-outline-neutral h-8 px-2.5 text-danger"
                    onClick={() => onDeactivate(promotion)}
                    disabled={!promotion.active || deletingId === promotion.id}
                    title={promotion.active ? 'Ngừng hoạt động khuyến mãi' : 'Khuyến mãi đã ngừng hoạt động'}
                  >
                    <DisableIcon />
                    {deletingId === promotion.id ? 'Đang xử lý' : 'Ngừng'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className={td}><Skeleton className="h-4 w-16" /></td>
                <td className={td}><Skeleton className="h-4 w-full max-w-[18rem]" /></td>
                <td className={td}><Skeleton className="h-4 w-14" /></td>
                <td className={td}><Skeleton className="h-4 w-32" /></td>
                <td className={td}><Skeleton className="h-6 w-24 rounded-full" /></td>
                <td className={`${td} text-right`}><Skeleton className="h-4 w-20 ml-auto" /></td>
                <td className={`${td} text-center`}><Skeleton className="h-8 w-28 mx-auto rounded-md" /></td>
              </tr>
            ))}
          {!loading && promotions.length === 0 && (
            <tr>
              <td className={`${td} text-center text-ink-muted py-16`} colSpan={7}>Không tìm thấy khuyến mãi nào</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {!loading && promotions.length > 0 && (
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">Tổng số {total} khuyến mãi</span>
        <div className="flex items-center gap-2">
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Trang trước"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="text-md text-ink-subtle">Trang {page} / {totalPages}</span>
          <button
            className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Trang sau"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    )}
  </div>
)

export default PromotionTable
