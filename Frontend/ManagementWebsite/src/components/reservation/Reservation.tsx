import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReservationHeader from './ReservationHeader'
import type { ReservationTab } from './ReservationHeader'
import CalendarView from './CalendarView'
import ListView from './ListView'
import ReservationModal from './ReservationModal'
import EditReservationModal from './EditReservationModal'
import type { Reservation as Res } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../api/auth'
import {
  listReservations,
  confirmReservation,
  cancelReservation,
  checkInReservation,
  noShowReservation,
  updateReservation,
  transferTable as apiTransferTable,
  type ReservationDto,
} from '../../api/reservations'
import { listTables, type TableDto } from '../../api/tables'
import { pollReservationNotifResult, getNotificationLogs, type NotificationLogDto } from '../../api/notifications'
import ChangePasswordModal from '../auth/ChangePasswordModal'
import { useRealtime } from '../../hooks/useRealtime'

const toDisplay = (dto: ReservationDto): Res => {
  const dt = new Date(dto.datetime)
  const pad = (n: number) => String(n).padStart(2, '0')
  const arriveTime = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  return {
    id: dto.id,
    code: dto.id,
    arriveTime,
    customer: dto.guestName,
    phone: dto.phone,
    guestEmail: dto.guestEmail ?? null,
    guests: dto.partySize,
    table: dto.tableName ?? '—',
    area: dto.tableArea ?? '',
    status: dto.status,
    note: dto.note ?? '',
    startHour: dt.getHours() + dt.getMinutes() / 60,
    durationH: 1.5,
  }
}

const exportCsv = (rows: Res[]) => {
  const header = ['Mã đặt bàn', 'Giờ đến', 'Khách hàng', 'Điện thoại', 'Số khách', 'Trạng thái', 'Ghi chú']
  const data = rows.map(r => [r.id, r.arriveTime, r.customer, r.phone, r.guests, r.status, r.note])
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
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [showChangePw, setShowChangePw] = useState(false)
  const [tab, setTab] = useState<ReservationTab>('calendar')
  const [items, setItems] = useState<Res[]>([])
  const [dtos, setDtos] = useState<ReservationDto[]>([])
  const [editingDto, setEditingDto] = useState<ReservationDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tables, setTables] = useState<TableDto[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [notifLogs, setNotifLogs] = useState<NotificationLogDto[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [newReservations, setNewReservations] = useState<ReservationDto[]>([])
  const [unseenNotifCount, setUnseenNotifCount] = useState(0)

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success', ms = 3500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  // Load once on mount so the list (and any FAILED badge) is ready even before the bell is
  // ever opened — the dropdown-open effect below still refreshes it for freshness each time.
  useEffect(() => {
    getNotificationLogs({ size: 20 })
      .then(r => setNotifLogs(r.data.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!bellOpen) return
    setNotifLoading(true)
    getNotificationLogs({ size: 20 })
      .then(r => setNotifLogs(r.data.data))
      .catch(() => {})
      .finally(() => setNotifLoading(false))
  }, [bellOpen])

  // Live push for any notification (payment, reservation confirm/cancel/reminder, table
  // update, ...) — not just new bookings — so the bell/list update in real time everywhere.
  useRealtime('/topic/notifications', (body) => {
    const log = body as NotificationLogDto | null
    if (!log?.id) return
    setNotifLogs(prev => prev.some(l => l.id === log.id) ? prev : [log, ...prev].slice(0, 50))
    setUnseenNotifCount(c => c + 1)
  })

  const pollEmailResult = async (reservationId: string, _actionLabel: string, expectedTemplate?: string) => {
    // Poll at 3s / 5s / 7s — async SMTP can be slow; FAILED may only appear after ~10s
    for (const delay of [3000, 5000, 7000]) {
      await new Promise(r => setTimeout(r, delay))
      try {
        const res = await pollReservationNotifResult(reservationId)
        const logs = res.data.data
        // Look for the specific notification template we just triggered; fall back to most recent
        const log = (expectedTemplate ? logs.find(l => l.template === expectedTemplate) : null) ?? logs[0]
        if (!log) continue   // async task hasn't written the log yet — retry
        if (log.status === 'PENDING') continue
        if (log.status === 'SENT') {
          showToast(`Email đã được gửi đến ${log.recipient}`, 'info')
        } else {
          showToast(`Gửi email thất bại — kiểm tra lại địa chỉ email của khách`, 'error')
        }
        return
      } catch { return }
    }
    // All retries exhausted without a conclusive status
    showToast('Không xác nhận được trạng thái email — vui lòng kiểm tra nhật ký thông báo', 'info')
  }

  const handleLogout = async () => {
    try { await logout() } catch { /* ignore */ }
    signOut()
    navigate('/login', { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listReservations(0, 200)
      const rawDtos = res.data.data.data
      setDtos(rawDtos)
      setItems(rawDtos.map(toDisplay))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  const loadTables = useCallback(() => {
    listTables().then(r => setTables(r.data.data)).catch(() => {})
  }, [])

  const handleEdit = (id: string) => {
    const dto = dtos.find(d => d.id === id)
    if (dto) setEditingDto(dto)
  }

  useEffect(() => { load() }, [load])

  useEffect(() => { loadTables() }, [loadTables])

  // Live push for reservation changes — new bookings (online or staff-created) AND status
  // changes (confirm/check-in/no-show/cancel, or the automatic CHECKED_IN→COMPLETED once a
  // table's order closes). Previously only 'CREATED' refreshed the list, so a status change
  // made elsewhere (another waiter/cashier, or the BR-04 no-show cron) never showed up here
  // without a manual page reload. Table statuses move in lockstep with reservation status
  // (check-in/cancel/no-show/complete all flip a table too), so refresh both together — this
  // keeps the "Xếp bàn" table-assignment dropdown from showing stale availability as well.
  useRealtime('/topic/reservations', (body) => {
    const evt = body as { eventType?: string; reservation?: ReservationDto } | null
    if (!evt?.eventType || !evt.reservation) return
    load()
    loadTables()
    if (evt.eventType === 'CREATED' && evt.reservation.status === 'PENDING') {
      setNewReservations(prev => [evt.reservation as ReservationDto, ...prev].slice(0, 20))
      showToast(`Có yêu cầu đặt bàn mới: ${evt.reservation.guestName} — ${evt.reservation.partySize} khách`, 'info', 6000)
    }
  })

  const handleConfirm = async (id: string) => {
    const guestEmail = items.find(r => r.id === id)?.guestEmail ?? null
    try {
      await confirmReservation(id)
      await load()
      if (guestEmail) {
        showToast('Đã xác nhận — đang gửi email cho khách...', 'info', 10000)
        pollEmailResult(id, 'Xác nhận đặt bàn', 'RESERVATION_CONFIRMATION')
      } else {
        showToast('Đã xác nhận đặt bàn')
      }
    } catch { showToast('Không thể xác nhận', 'error') }
  }
  const handleCancel = async (id: string) => {
    const guestEmail = items.find(r => r.id === id)?.guestEmail ?? null
    try {
      await cancelReservation(id)
      await load()
      if (guestEmail) {
        showToast('Đã hủy — đang gửi email cho khách...', 'info', 10000)
        pollEmailResult(id, 'Hủy đặt bàn', 'RESERVATION_CANCELLATION')
      } else {
        showToast('Đã hủy đặt bàn')
      }
    } catch { showToast('Không thể hủy', 'error') }
  }
  const handleCheckIn = async (id: string) => {
    try { await checkInReservation(id); await load(); showToast('Check-in thành công') }
    catch { showToast('Không thể check-in', 'error') }
  }
  const handleNoShow = async (id: string) => {
    try { await noShowReservation(id); await load(); showToast('Đã đánh dấu không đến') }
    catch { showToast('Không thể cập nhật', 'error') }
  }

  const handleAssignTable = async (reservationId: string, tableId: string) => {
    const guestEmail = items.find(r => r.id === reservationId)?.guestEmail ?? null
    try {
      await updateReservation(reservationId, { tableId })
      await load()
      if (guestEmail) {
        showToast('Đã xếp bàn — đang gửi email cho khách...', 'info', 10000)
        pollEmailResult(reservationId, 'Xếp bàn', 'RESERVATION_TABLE_UPDATE')
      } else {
        showToast('Đã xếp bàn thành công (chưa có email để thông báo)')
      }
    } catch { showToast('Không thể xếp bàn', 'error') }
  }

  const handleTransferTable = async (reservationId: string, tableId: string) => {
    const guestEmail = items.find(r => r.id === reservationId)?.guestEmail ?? null
    try {
      await apiTransferTable(reservationId, tableId)
      await load()
      if (guestEmail) {
        showToast('Đã chuyển bàn — đang gửi email cho khách...', 'info', 10000)
        pollEmailResult(reservationId, 'Chuyển bàn', 'RESERVATION_TABLE_UPDATE')
      } else {
        showToast('Đã chuyển bàn thành công (chưa có email để thông báo)')
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      showToast(msg ?? 'Không thể chuyển bàn', 'error')
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-surface">
      <ReservationHeader
        tab={tab}
        onTab={setTab}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePw(true)}
        notifLogs={notifLogs}
        notifLoading={notifLoading}
        bellOpen={bellOpen}
        onBellToggle={() => setBellOpen(v => {
          const next = !v
          if (!next) { setNewReservations([]); setUnseenNotifCount(0) }
          return next
        })}
        newReservations={newReservations}
        unseenNotifCount={unseenNotifCount}
        onOpenReservation={(dto) => setEditingDto(dto)}
      />

      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Floating action cluster */}
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

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
            <span className="text-md text-ink-muted">Đang tải...</span>
          </div>
        )}

        {tab === 'calendar' ? (
          <CalendarView
            reservations={items}
            tables={tables}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAssignTable={handleAssignTable}
            onTransferTable={handleTransferTable}
            onConfirm={handleConfirm}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
            onNoShow={handleNoShow}
            onEdit={handleEdit}
          />
        ) : (
          <ListView
            reservations={items}
            tables={tables}
            onConfirm={handleConfirm}
            onCheckIn={handleCheckIn}
            onNoShow={handleNoShow}
            onCancel={handleCancel}
            onAssignTable={handleAssignTable}
            onEdit={handleEdit}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-[10px] text-white text-[14px] font-semibold shadow-lg ${
          toast.type === 'error' ? 'bg-danger' : toast.type === 'info' ? 'bg-[#025cca]' : 'bg-[var(--kv-success)]'
        }`}>
          {toast.msg}
        </div>
      )}

      {showModal && <ReservationModal reservations={dtos} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}
      {editingDto && (
        <EditReservationModal
          dto={editingDto}
          onClose={() => setEditingDto(null)}
          onSaved={() => { setEditingDto(null); void load() }}
        />
      )}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}

export default Reservation
