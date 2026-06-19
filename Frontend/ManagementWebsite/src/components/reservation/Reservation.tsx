import { useMemo, useState } from 'react'
import ReservationHeader from './ReservationHeader'
import type { ReservationTab } from './ReservationHeader'
import CalendarView from './CalendarView'
import ListView from './ListView'
import ReservationModal from './ReservationModal'
import { reservations as initialReservations } from '../../data/mockData'
import type { Reservation as Res } from '../../data/mockData'

const exportCsv = (rows: Res[]) => {
  const header = ['Mã đặt bàn', 'Giờ đến', 'Khách hàng', 'Điện thoại', 'Số khách', 'Phòng/bàn', 'Trạng thái', 'Ghi chú']
  const data = rows.map(r => [r.code, r.arriveTime, r.customer, r.phone, r.guests, r.table, r.status, r.note])
  const csv = [header, ...data].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dat-ban-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const Reservation = () => {
  const [tab, setTab] = useState<ReservationTab>('calendar')
  const [items, setItems] = useState<Res[]>(initialReservations)
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 5, 17))
  const [showModal, setShowModal] = useState(false)

  const nextCode = useMemo(() => {
    const max = items.reduce((m, r) => {
      const n = parseInt(r.code.replace(/\D/g, ''), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    return 'DB' + String(max + 1).padStart(6, '0')
  }, [items])

  const handleSave = (r: Res) => {
    setItems(prev => [r, ...prev])
    setShowModal(false)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-surface">
      <ReservationHeader tab={tab} onTab={setTab} />

      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Floating action cluster (top-right of body) */}
        <div className="absolute top-3 right-5 z-30 flex items-center gap-2">
          <button className="kv-btn kv-btn-outline-primary h-10 bg-card" onClick={() => exportCsv(items)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
            Xuất file
          </button>
          <button className="kv-btn kv-btn-primary h-10" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Đặt bàn (F1)
          </button>
        </div>

        {tab === 'calendar' ? (
          <CalendarView reservations={items} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        ) : (
          <ListView reservations={items} />
        )}
      </div>

      {showModal && <ReservationModal nextCode={nextCode} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}

export default Reservation
