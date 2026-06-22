import { useMemo, useState } from 'react'
import RoomFilters from './RoomFilters'
import type { AreaFilter, StatusFilter } from './RoomFilters'
import RoomToolbar from './RoomToolbar'
import RoomTable from './RoomTable'
import RoomModal from './RoomModal'
import QrModal from './QrModal'
import { rooms as initialRooms, roomAreas as initialAreas } from '../../data/mockData'
import type { Room } from '../../data/mockData'

const Rooms = () => {
  const [items, setItems] = useState<Room[]>(initialRooms)
  const [areas, setAreas] = useState<string[]>(initialAreas)
  const [search, setSearch] = useState('')
  const [area, setArea] = useState<AreaFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('active')

  // modal state
  const [showAdd, setShowAdd] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [qrRoom, setQrRoom] = useState<Room | null>(null)

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

  const createArea = (): string | undefined => {
    const name = window.prompt('Tên khu vực mới:')?.trim()
    if (!name) return undefined
    setAreas(prev => (prev.includes(name) ? prev : [...prev, name]))
    return name
  }

  const handleSave = (room: Room, addAnother: boolean) => {
    setItems(prev => {
      const exists = prev.some(r => r.id === room.id)
      return exists ? prev.map(r => (r.id === room.id ? room : r)) : [room, ...prev]
    })
    if (room.area && !areas.includes(room.area)) setAreas(prev => [...prev, room.area])
    if (!addAnother) {
      setShowAdd(false)
      setEditRoom(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-h2 font-extrabold text-ink mb-5">Phòng/Bàn</h1>
        <RoomFilters
          areas={areas}
          area={area}
          status={status}
          onArea={setArea}
          onStatus={setStatus}
          onCreateArea={createArea}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <RoomToolbar
          search={search}
          onSearch={setSearch}
          onAdd={() => setShowAdd(true)}
          rooms={items}
        />
        <RoomTable
          rooms={filtered}
          total={items.length}
          onViewQr={setQrRoom}
          onRowClick={setEditRoom}
        />
      </section>

      {showAdd && (
        <RoomModal
          areas={areas}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          onCreateArea={createArea}
        />
      )}
      {editRoom && (
        <RoomModal
          room={editRoom}
          areas={areas}
          onClose={() => setEditRoom(null)}
          onSave={handleSave}
          onCreateArea={createArea}
        />
      )}
      {qrRoom && <QrModal room={qrRoom} onClose={() => setQrRoom(null)} />}
    </div>
  )
}

export default Rooms
