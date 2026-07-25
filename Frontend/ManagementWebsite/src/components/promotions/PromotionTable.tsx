import type { Promotion } from '../../services/promotionApi'
import { Skeleton } from '../dashboard/DashboardStates'

interface Props {
  promotions: Promotion[]
  loading: boolean
  deletingId: string | null
  onEdit: (promotion: Promotion) => void
  onDeactivate: (promotion: Promotion) => void
}

// Headers wrap (unlike other tables here): with 8 columns in a ~990px pane, a nowrap
// "Mã khuyến mãi" alone claimed 127px of width purely for its label. Wrapping the two-word
// headers costs one header row of height once, instead of width on every data row.
const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 align-bottom'
// `td` deliberately carries no white-space rule: adding `whitespace-normal` on top of a
// shared `whitespace-nowrap` never worked (equal specificity, so Tailwind's stylesheet order
// decided and nowrap won), which silently forced the description column to its full
// single-line width and pushed the action buttons off-screen. Wrapping is now opt-out.
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle'
const tdNoWrap = `${td} whitespace-nowrap`

const formatDate = (value: string | null) => {
  if (!value) return 'Không giới hạn'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
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

const PromotionTable = ({ promotions, loading, deletingId, onEdit, onDeactivate }: Props) => (
  <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
    <div className="flex-1 min-h-0 overflow-auto">
      {/* Giới hạn / Đã dùng / Còn lại used to be three separate columns, which pushed the table
          to ~1400px and scrolled the action buttons off-screen on a 1366px laptop. Usage is
          naturally a ratio, so they collapse into one column and the table now fits its pane. */}
      <table className="w-full min-w-[64rem] border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-[10rem]`}>Mã khuyến mãi</th>
            <th className={`${th} min-w-[16rem]`}>Mô tả</th>
            <th className={`${th} w-[9rem]`}>Mức giảm</th>
            <th className={`${th} w-[9rem]`}>Từ ngày</th>
            <th className={`${th} w-[9rem]`}>Đến ngày</th>
            <th className={`${th} w-[11rem]`}>Trạng thái</th>
            <th className={`${th} text-right w-[11rem]`}>Lượt sử dụng</th>
            <th className={`${th} text-center w-[13rem]`}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {!loading && promotions.map(promotion => (
            <tr key={promotion.id} className="hover:bg-primary-25">
              <td className={`${tdNoWrap} text-primary font-semibold`}>{promotion.code}</td>
              <td className={`${td} min-w-[16rem]`}>{promotion.description || '—'}</td>
              <td className={`${tdNoWrap} font-medium`}>{formatDiscount(promotion)}</td>
              <td className={tdNoWrap}>{formatDate(promotion.validFrom)}</td>
              <td className={tdNoWrap}>{formatDate(promotion.validTo)}</td>
              <td className={tdNoWrap}>
                <span className={`kv-badge ${promotion.active ? 'kv-badge-success' : 'kv-badge-neutral'}`}>
                  {promotion.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
              </td>
              <td className={`${tdNoWrap} text-right`}>
                <span className="font-semibold text-ink">{promotion.usedCount.toLocaleString('vi-VN')}</span>
                {promotion.usageLimit === null ? (
                  <span className="text-ink-muted" title="Không giới hạn lượt sử dụng"> / ∞</span>
                ) : (
                  <>
                    <span className="text-ink-muted"> / {promotion.usageLimit.toLocaleString('vi-VN')}</span>
                    {promotion.remainingUses !== null && (
                      <span className="text-sm text-ink-muted"> · còn {promotion.remainingUses.toLocaleString('vi-VN')}</span>
                    )}
                  </>
                )}
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
                <td className={td}><Skeleton className="h-4 w-48" /></td>
                <td className={td}><Skeleton className="h-4 w-14" /></td>
                <td className={td}><Skeleton className="h-4 w-20" /></td>
                <td className={td}><Skeleton className="h-4 w-20" /></td>
                <td className={td}><Skeleton className="h-6 w-24 rounded-full" /></td>
                <td className={`${td} text-right`}><Skeleton className="h-4 w-20 ml-auto" /></td>
                <td className={`${td} text-center`}><Skeleton className="h-8 w-28 mx-auto rounded-md" /></td>
              </tr>
            ))}
          {!loading && promotions.length === 0 && (
            <tr>
              <td className={`${td} text-center text-ink-muted py-16`} colSpan={8}>Không tìm thấy khuyến mãi nào</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="flex items-center px-4 py-3 border-t border-line shrink-0">
      <span className="text-md text-ink-subtle">Tổng số {promotions.length} khuyến mãi</span>
    </div>
  </div>
)

export default PromotionTable
