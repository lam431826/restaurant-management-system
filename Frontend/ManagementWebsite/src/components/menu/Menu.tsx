import { useCallback, useEffect, useMemo, useState } from 'react'
import MenuFilters from './MenuFilters'
import type { MenuStatusFilter } from './MenuFilters'
import MenuToolbar from './MenuToolbar'
import MenuTable from './MenuTable'
import AddItemModal from './AddItemModal'
import type { NewItemKind } from './AddItemModal'
import ConfirmDialog from './ConfirmDialog'
import CategoryManagerModal from './CategoryManagerModal'
import { searchItems, listCategories, setAvailability, deleteItem, bulkSetAvailability, bulkDeleteItems } from '../../services/menuService'
import type { MenuItem, MenuCategory } from '../../services/menuService'
import { ApiError } from '../../services/api'

export type SortKey = 'code' | 'name' | 'price'
export type SortDir = 'asc' | 'desc'

const Menu = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  // Default ordering: by product code ascending.
  const [sortKey, setSortKey] = useState<SortKey | null>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<MenuStatusFilter>('all')
  const [menuType, setMenuType] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modalKind, setModalKind] = useState<NewItemKind | null>(null)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

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
    setSelected(new Set())
    try {
      const available = status === 'all' ? undefined : status === 'active'
      const res = await searchItems({
        q: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        available,
        menuType: menuType || undefined,
        page,
        size: pageSize,
        sort: sortKey ? `${sortKey},${sortDir}` : undefined,
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
  }, [debouncedSearch, categoryId, status, menuType, page, pageSize, sortKey, sortDir])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, categoryId, status, menuType, pageSize, sortKey, sortDir])

  // Click a sortable header: asc → desc → back to the default (code asc).
  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey('code'); setSortDir('asc') }
  }

  useEffect(() => { void loadCategories() }, [loadCategories])
  useEffect(() => { void loadItems() }, [loadItems])

  const reload = () => { void loadItems(); void loadCategories() }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await setAvailability(item.id, !item.available)
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, available: !i.available } : i)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái.')
    }
  }

  const toggleSelect = (id: string) =>
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelected(prev => (items.length > 0 && items.every(i => prev.has(i.id)) ? new Set() : new Set(items.map(i => i.id))))

  // Select every item matching the current filters, across all pages.
  const selectAllMatching = async () => {
    setBulkBusy(true)
    try {
      const available = status === 'all' ? undefined : status === 'active'
      const res = await searchItems({
        q: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        available,
        menuType: menuType || undefined,
        page: 1,
        size: Math.max(total, 1),
      })
      setSelected(new Set(res.data.map(i => i.id)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không chọn được tất cả món.')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkAvailability = async (available: boolean) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkBusy(true)
    setError('')
    try {
      await bulkSetAvailability(ids, available)
      setItems(prev => prev.map(i => (selected.has(i.id) ? { ...i, available } : i)))
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái.')
    } finally {
      setBulkBusy(false)
    }
  }

  const confirmBulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkBusy(true)
    setError('')
    try {
      await bulkDeleteItems(ids)
      setBulkDeleteOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được món.')
      setBulkDeleteOpen(false)
    } finally {
      setBulkBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await deleteItem(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được món.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const closeModal = () => { setModalKind(null); setEditItem(null) }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-h2 font-extrabold text-ink mb-5">Món</h1>
        <MenuFilters
          categories={categories}
          categoryId={categoryId}
          status={status}
          menuType={menuType}
          onCategory={setCategoryId}
          onStatus={setStatus}
          onMenuType={setMenuType}
          onManageCategories={() => setShowCategoryManager(true)}
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

        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-primary-25 border border-primary-150">
            <span className="text-md font-medium text-ink">Đã chọn {selected.size} món</span>
            {selected.size < total && (
              <button className="kv-btn kv-btn-text-primary h-9" disabled={bulkBusy} onClick={() => void selectAllMatching()}>
                Chọn tất cả {total} món
              </button>
            )}
            <div className="flex-1" />
            <button className="kv-btn kv-btn-outline-neutral h-9" disabled={bulkBusy} onClick={() => handleBulkAvailability(false)}>
              Ngừng bán
            </button>
            <button className="kv-btn kv-btn-outline-neutral h-9" disabled={bulkBusy} onClick={() => handleBulkAvailability(true)}>
              Mở bán
            </button>
            <button
              className="h-9 px-4 rounded-md bg-danger text-white font-medium transition-colors hover:bg-danger-600 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={bulkBusy}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Xóa
            </button>
            <button className="kv-btn kv-btn-text-primary h-9" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </button>
          </div>
        )}

        <MenuTable
          items={items}
          loading={loading}
          categoryNames={categoryNames}
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={setEditItem}
          onToggleAvailability={handleToggleAvailability}
          onDelete={setDeleteTarget}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
        />
      </section>

      {(modalKind || editItem) && (
        <AddItemModal
          kind={modalKind ?? 'mon'}
          item={editItem ?? undefined}
          categories={categories}
          onClose={closeModal}
          onSaved={reload}
          onCategoryCreated={loadCategories}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Xóa món"
          message={<>Bạn có chắc muốn xóa món <b className="text-ink">{deleteTarget.name}</b>? Hành động này không thể hoàn tác.</>}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {bulkDeleteOpen && (
        <ConfirmDialog
          title="Xóa nhiều món"
          message={<>Bạn có chắc muốn xóa <b className="text-ink">{selected.size} món</b> đã chọn? Hành động này không thể hoàn tác.</>}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          loading={bulkBusy}
          onConfirm={confirmBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onChanged={reload}
        />
      )}
    </div>
  )
}

export default Menu
