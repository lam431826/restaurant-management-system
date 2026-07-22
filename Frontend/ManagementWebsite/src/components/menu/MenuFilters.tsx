import type { MenuCategory } from '../../services/menuService'

export type MenuStatusFilter = 'all' | 'active' | 'inactive'

interface Props {
  categories: MenuCategory[]
  categoryId: string
  status: MenuStatusFilter
  menuType: string
  onCategory: (id: string) => void
  onStatus: (s: MenuStatusFilter) => void
  onMenuType: (t: string) => void
  onManageCategories: () => void
}

const MENU_TYPES = ['Đồ ăn', 'Đồ uống', 'Dịch vụ', 'Khác']

const MenuFilters = ({ categories, categoryId, status, menuType, onCategory, onStatus, onMenuType, onManageCategories }: Props) => (
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

    {/* Loại thực đơn — functional; checking a type filters to it, checking the active one again clears it */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Loại thực đơn</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {MENU_TYPES.map(t => (
          <label key={t} className="kv-check">
            <input type="checkbox" checked={menuType === t} onChange={() => onMenuType(menuType === t ? '' : t)} />
            <span className="kv-check-box" />
            <span className="kv-check-text">{t}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
)

export default MenuFilters
