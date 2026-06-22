import { useState } from 'react'

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FilterSelect = ({ placeholder }: { placeholder: string }) => (
  <button
    className="flex items-center justify-between w-full h-10 px-3 bg-field border border-line-default rounded-md cursor-pointer transition-colors hover:border-line-strong"
    type="button"
  >
    <span className="text-md text-ink-muted">{placeholder}</span>
    <ChevronDown />
  </button>
)

const segBtn = (active: boolean) =>
  [
    'flex-1 h-8 px-3 border rounded-full text-md font-medium cursor-pointer transition-colors',
    active
      ? 'bg-primary border-primary text-white font-semibold'
      : 'bg-field border-line-default text-ink-subtle hover:border-primary hover:text-primary',
  ].join(' ')

const MENU_TYPES = ['Đồ ăn', 'Đồ uống', 'Dịch vụ', 'Khác']

const MenuFilters = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [direct, setDirect] = useState<'all' | 'yes' | 'no'>('all')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active')

  const toggle = (k: string) => setChecked(c => ({ ...c, [k]: !c[k] }))

  return (
    <div className="flex flex-col gap-5">
      {/* Loại thực đơn */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Loại thực đơn</div>
        <div className="flex flex-col gap-1.5 mt-1">
          {MENU_TYPES.map(t => (
            <label key={t} className="kv-check">
              <input type="checkbox" checked={!!checked[t]} onChange={() => toggle(t)} />
              <span className="kv-check-box" />
              <span className="kv-check-text">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Loại món */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Loại món</div>
        <FilterSelect placeholder="Chọn loại món" />
      </div>

      {/* Nhóm món */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-md font-semibold text-ink">
          <span>Nhóm món</span>
          <a href="#" className="text-sm font-medium text-primary">Tạo mới</a>
        </div>
        <FilterSelect placeholder="Chọn nhóm món" />
      </div>

      {/* Tồn kho */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Tồn kho</div>
        <button
          className="flex items-center justify-between w-full h-10 px-3 bg-field border border-line-default rounded-md cursor-pointer transition-colors hover:border-line-strong"
          type="button"
        >
          <span className="text-md text-ink">Tất cả</span>
          <ChevronDown />
        </button>
      </div>

      {/* Bán trực tiếp */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Bán trực tiếp</div>
        <div className="flex gap-2">
          {([['all', 'Tất cả'], ['yes', 'Có'], ['no', 'Không']] as const).map(([id, label]) => (
            <button key={id} className={segBtn(direct === id)} onClick={() => setDirect(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thuộc tính */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Thuộc tính</div>
        <FilterSelect placeholder="Size" />
      </div>

      {/* Trạng thái */}
      <div className="flex flex-col gap-2">
        <div className="text-md font-semibold text-ink">Trạng thái</div>
        <div className="flex flex-col gap-1.5 mt-1">
          {([['active', 'Đang kinh doanh'], ['inactive', 'Ngừng kinh doanh'], ['all', 'Tất cả']] as const).map(
            ([id, label]) => (
              <label key={id} className="kv-radio">
                <input
                  type="radio"
                  name="menu-status"
                  checked={status === id}
                  onChange={() => setStatus(id)}
                />
                <span className="kv-radio-dot" />
                <span className="kv-radio-text">{label}</span>
              </label>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuFilters
