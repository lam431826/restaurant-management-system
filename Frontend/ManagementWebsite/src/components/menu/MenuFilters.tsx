import type { MenuCategory } from '../../services/menuService'

export type MenuStatusFilter = 'all' | 'active' | 'inactive'

interface Props {
  categories: MenuCategory[]
  categoryId: string
  status: MenuStatusFilter
  onCategory: (id: string) => void
  onStatus: (s: MenuStatusFilter) => void
  onManageCategories: () => void
}

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

const MENU_TYPES = ['Đồ ăn', 'Đồ uống', 'Dịch vụ', 'Khác']

const MenuFilters = ({ categories, categoryId, status, onCategory, onStatus, onManageCategories }: Props) => (
  <div className="flex flex-col gap-5">
    {/* Nhóm món (danh mục) — functional */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-md font-semibold text-ink">Nhóm món</span>
        <button className="text-sm font-medium text-primary hover:underline" onClick={onManageCategories}>
          Quản lý
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          className={`text-left px-3 py-2 rounded-md text-md transition-colors ${categoryId === '' ? 'bg-primary-25 text-primary font-medium' : 'text-ink hover:bg-fill'}`}
          onClick={() => onCategory('')}
        >
          Tất cả nhóm
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`flex items-center justify-between px-3 py-2 rounded-md text-md transition-colors ${categoryId === c.id ? 'bg-primary-25 text-primary font-medium' : 'text-ink hover:bg-fill'}`}
            onClick={() => onCategory(c.id)}
          >
            <span className="truncate">{c.name}</span>
            <span className="text-sm text-ink-muted ml-2 shrink-0">{c.itemCount}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Trạng thái — functional */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Trạng thái</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {([['active', 'Đang bán'], ['inactive', 'Hết hàng'], ['all', 'Tất cả']] as const).map(([id, label]) => (
          <label key={id} className="kv-radio">
            <input type="radio" name="menu-status" checked={status === id} onChange={() => onStatus(id)} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{label}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Loại thực đơn (cosmetic) */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Loại thực đơn</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {MENU_TYPES.map(t => (
          <label key={t} className="kv-check">
            <input type="checkbox" disabled />
            <span className="kv-check-box" />
            <span className="kv-check-text">{t}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Tồn kho (cosmetic) */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Tồn kho</div>
      <FilterSelect placeholder="Tất cả" />
    </div>
  </div>
)

export default MenuFilters
