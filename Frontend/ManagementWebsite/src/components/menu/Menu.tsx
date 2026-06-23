import { useCallback, useEffect, useMemo, useState } from 'react'
import MenuFilters from './MenuFilters'
import type { MenuStatusFilter } from './MenuFilters'
import MenuToolbar from './MenuToolbar'
import MenuTable from './MenuTable'
import AddItemModal from './AddItemModal'
import type { NewItemKind } from './AddItemModal'
import { searchItems, listCategories, setAvailability, deleteItem } from '../../services/menuService'
import type { MenuItem, MenuCategory } from '../../services/menuService'
import { ApiError } from '../../services/api'

const PAGE_SIZE = 20

const Menu = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<MenuStatusFilter>('all')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modalKind, setModalKind] = useState<NewItemKind | null>(null)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)

  const categoryNames = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories])

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listCategories())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh mục.')
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const available = status === 'all' ? undefined : status === 'active'
      const res = await searchItems({
        q: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        available,
        page,
        size: PAGE_SIZE,
      })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách món.')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryId, status, page])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, categoryId, status])

  useEffect(() => { void loadCategories() }, [loadCategories])
  useEffect(() => { void loadItems() }, [loadItems])

  // Auto product code (SP000026, …) based on the highest existing numeric code.
  const nextCode = useMemo(() => {
    const max = items.reduce((m, p) => {
      const n = parseInt((p.code ?? '').replace(/\D/g, ''), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 25)
    return 'SP' + String(max + 1).padStart(6, '0')
  }, [items])

  const reload = () => { void loadItems(); void loadCategories() }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await setAvailability(item.id, !item.available)
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, available: !i.available } : i)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái.')
    }
  }

  const handleDelete = async (item: MenuItem) => {
    if (!window.confirm(`Xóa món "${item.name}"?`)) return
    try {
      await deleteItem(item.id)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được món.')
    }
  }

  const closeModal = () => { setModalKind(null); setEditItem(null) }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-h2 font-extrabold text-ink mb-5">Món</h1>
        <MenuFilters
          categories={categories}
          categoryId={categoryId}
          status={status}
          onCategory={setCategoryId}
          onStatus={setStatus}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <MenuToolbar
          search={search}
          onSearch={setSearch}
          onNew={setModalKind}
          onImported={reload}
          onError={setError}
        />

        {error && (
          <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>
        )}

        <MenuTable
          items={items}
          loading={loading}
          categoryNames={categoryNames}
          total={total}
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          onRowClick={setEditItem}
          onToggleAvailability={handleToggleAvailability}
          onDelete={handleDelete}
        />
      </section>

      {(modalKind || editItem) && (
        <AddItemModal
          kind={modalKind ?? 'mon'}
          item={editItem ?? undefined}
          categories={categories}
          nextCode={nextCode}
          onClose={closeModal}
          onSaved={reload}
          onCategoryCreated={loadCategories}
        />
      )}
    </div>
  )
}

export default Menu
