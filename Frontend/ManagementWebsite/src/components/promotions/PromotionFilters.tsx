import { useState } from 'react'

export type PromotionStatusFilter = 'all' | 'active' | 'inactive'

export interface PromotionFilterState {
  search: string
  status: PromotionStatusFilter
}

interface Props {
  initialState: PromotionFilterState
  onApply: (filters: PromotionFilterState) => void
}

const fieldCls =
  "w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors " +
  "placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary"

const PromotionFilters = ({ initialState, onApply }: Props) => {
  const [search, setSearch] = useState(initialState.search)
  const [status, setStatus] = useState<PromotionStatusFilter>(initialState.status)

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault()
    onApply({ search: search.trim(), status })
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('all')
    onApply({ search: '', status: 'all' })
  }

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-5">
      <div>
        <h2 className="text-h3 font-bold text-ink">Lọc khuyến mãi</h2>
        <p className="text-sm text-ink-subtle mt-1">
          Tìm theo mã, mô tả và trạng thái hoạt động
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Mã hoặc mô tả</label>
        <input
          className={fieldCls}
          placeholder="Nhập mã hoặc mô tả"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-line pb-5">
        <span className="text-md font-semibold text-ink">Trạng thái</span>
        {(
          [
            ['all', 'Tất cả'],
            ['active', 'Đang hoạt động'],
            ['inactive', 'Ngừng hoạt động'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="kv-radio">
            <input
              type="radio"
              name="promotion-status"
              checked={status === value}
              onChange={() => setStatus(value)}
            />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" className="kv-btn kv-btn-primary h-10 w-full">
          Áp dụng bộ lọc
        </button>
        <button
          type="button"
          className="kv-btn kv-btn-outline-neutral h-10 w-full"
          onClick={resetFilters}
        >
          Đặt lại
        </button>
      </div>
    </form>
  )
}

export default PromotionFilters
