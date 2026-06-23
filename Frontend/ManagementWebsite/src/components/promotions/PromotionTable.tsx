import type { Promotion } from '../../services/promotionApi'

interface Props {
  promotions: Promotion[]
  loading: boolean
  deletingId: string | null
  onEdit: (promotion: Promotion) => void
  onDeactivate: (promotion: Promotion) => void
}

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-3 border-b border-line align-middle whitespace-nowrap'

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
      <table className="w-full min-w-[118rem] border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-[13rem]`}>Mã khuyến mãi</th>
            <th className={`${th} min-w-[20rem]`}>Mô tả</th>
            <th className={`${th} w-[14rem]`}>Mức giảm</th>
            <th className={`${th} w-[13rem]`}>Từ ngày</th>
            <th className={`${th} w-[13rem]`}>Đến ngày</th>
            <th className={`${th} w-[13rem]`}>Trạng thái</th>
            <th className={`${th} text-right w-[13rem]`}>Giới hạn</th>
            <th className={`${th} text-right w-[12rem]`}>Đã dùng</th>
            <th className={`${th} text-right w-[13rem]`}>Còn lại</th>
            <th className={`${th} text-center w-[17rem]`}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {!loading && promotions.map(promotion => (
            <tr key={promotion.id} className="hover:bg-primary-25">
              <td className={`${td} text-primary font-semibold`}>{promotion.code}</td>
              <td className={`${td} whitespace-normal min-w-[20rem]`}>{promotion.description || '—'}</td>
              <td className={`${td} font-medium`}>{formatDiscount(promotion)}</td>
              <td className={td}>{formatDate(promotion.validFrom)}</td>
              <td className={td}>{formatDate(promotion.validTo)}</td>
              <td className={td}>
                <span className={`kv-badge ${promotion.active ? 'kv-badge-success' : 'kv-badge-neutral'}`}>
                  {promotion.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
              </td>
              <td className={`${td} text-right`}>{promotion.usageLimit ?? 'Không giới hạn'}</td>
              <td className={`${td} text-right`}>{promotion.usedCount}</td>
              <td className={`${td} text-right`}>{promotion.remainingUses ?? 'Không giới hạn'}</td>
              <td className={`${td} text-center`}>
                <div className="inline-flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="kv-btn kv-btn-outline-primary h-8 px-3"
                    onClick={() => onEdit(promotion)}
                    title="Chỉnh sửa khuyến mãi"
                  >
                    <EditIcon />
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="kv-btn kv-btn-outline-neutral h-8 px-3 text-danger"
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
          {loading && (
            <tr>
              <td className={`${td} text-center text-ink-muted py-16`} colSpan={10}>Đang tải danh sách khuyến mãi...</td>
            </tr>
          )}
          {!loading && promotions.length === 0 && (
            <tr>
              <td className={`${td} text-center text-ink-muted py-16`} colSpan={10}>Không tìm thấy khuyến mãi nào</td>
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
