import { useCallback, useEffect, useMemo, useState } from 'react'
import RoomFilters from './RoomFilters'
import type { AreaFilter, StatusFilter } from './RoomFilters'
import RoomToolbar from './RoomToolbar'
import RoomTable from './RoomTable'
import RoomModal from './RoomModal'
import AreaModal from './AreaModal'
import QrModal from './QrModal'
import ConfirmDialog from '../menu/ConfirmDialog'
import { listTables, listAreas, setTableActive, deleteTable } from '../../services/tableService'
import type { TableItem, TableArea } from '../../services/tableService'
import { ApiError } from '../../services/api'

const Rooms = () => {
  const [items, setItems] = useState<TableItem[]>([])
  const [areas, setAreas] = useState<TableArea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [area, setArea] = useState<AreaFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  // modal state
  const [showAdd, setShowAdd] = useState(false)
  const [editTable, setEditTable] = useState<TableItem | null>(null)
  const [qrTable, setQrTable] = useState<TableItem | null>(null)
  const [showAddArea, setShowAddArea] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TableItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const areaNames = useMemo(() => areas.map(a => a.name), [areas])

  const loadAreas = useCallback(async () => {
    try {
      setAreas(await listAreas())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được khu vực.')
    }
  }, [])

  const loadTables = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listTables())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được danh sách phòng/bàn.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadAreas() }, [loadAreas])
  useEffect(() => { void loadTables() }, [loadTables])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(r => {
      if (area !== 'all' && r.area !== area) return false
      if (status === 'active' && !r.active) return false
      if (status === 'inactive' && r.active) return false
      if (q && !(`${r.name} ${r.seats}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, area, status, search])

  const handleToggleActive = async (table: TableItem) => {
    try {
      await setTableActive(table.id, !table.active)
      setItems(prev => prev.map(r => (r.id === table.id ? { ...r, active: !r.active } : r)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được trạng thái.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await deleteTable(deleteTarget.id)
      setDeleteTarget(null)
      void loadTables()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xóa được phòng/bàn.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-h2 font-extrabold text-ink mb-5">Phòng/Bàn</h1>
        <RoomFilters
          areas={areaNames}
          area={area}
          status={status}
          onArea={setArea}
          onStatus={setStatus}
          onCreateArea={() => setShowAddArea(true)}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <RoomToolbar
          search={search}
          onSearch={setSearch}
          onAdd={() => setShowAdd(true)}
          rooms={items}
          onImported={() => { void loadTables(); void loadAreas() }}
          onError={setError}
        />

        {error && (
          <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>
        )}

        <RoomTable
          rooms={filtered}
          total={items.length}
          loading={loading}
          onViewQr={setQrTable}
          onEdit={setEditTable}
          onToggleActive={handleToggleActive}
          onDelete={setDeleteTarget}
        />
      </section>

      {showAdd && (
        <RoomModal
          areas={areaNames}
          onClose={() => setShowAdd(false)}
          onSaved={loadTables}
          onCreateArea={() => setShowAddArea(true)}
        />
      )}
      {editTable && (
        <RoomModal
          table={editTable}
          areas={areaNames}
          onClose={() => setEditTable(null)}
          onSaved={loadTables}
          onCreateArea={() => setShowAddArea(true)}
        />
      )}
      {qrTable && <QrModal room={qrTable} onClose={() => setQrTable(null)} />}

      {showAddArea && (
        <AreaModal
          existingNames={areaNames}
          onClose={() => setShowAddArea(false)}
          onSaved={() => { setShowAddArea(false); void loadAreas() }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Xóa phòng/bàn"
          message={<>Bạn có chắc muốn xóa <b className="text-ink">{deleteTarget.name}</b>? Hành động này không thể hoàn tác.</>}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default Rooms
