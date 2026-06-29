import { useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import type { TableItem } from '../../services/tableService'

interface Props {
  room: TableItem
  onClose: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? ''

const QrModal = ({ room, onClose }: Props) => {
  const qrWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const qrValue = room.qrToken
    ? `${PUBLIC_SITE_URL}/menu?token=${room.qrToken}`
    : null

  const handleDownload = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `QR-${room.name}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[40rem] my-6 bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Mã QR gọi món</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink"
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="text-md text-ink-subtle">
            <span className="font-semibold text-ink">{room.name}</span>
            {room.area && <> · {room.area}</>}
          </div>

          <div className="p-3 bg-white rounded-md border border-line-default" ref={qrWrapperRef}>
            {qrValue ? (
              <QRCodeCanvas
                value={qrValue}
                size={240}
                bgColor="#ffffff"
                fgColor="#15171a"
                level="M"
                marginSize={2}
              />
            ) : (
              <div className="w-[240px] h-[240px] flex items-center justify-center text-sm text-ink-muted">
                Bàn chưa có mã QR
              </div>
            )}
          </div>

          {qrValue && (
            <p className="text-xs text-ink-muted break-all max-w-[28rem] text-center font-mono">
              {qrValue}
            </p>
          )}

          <p className="text-sm text-ink-muted text-center max-w-[28rem]">
            Khách quét mã để xem thực đơn và gọi món trực tiếp tại {room.name}.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Đóng</button>
          <button
            className="kv-btn kv-btn-primary h-10"
            onClick={handleDownload}
            disabled={!qrValue}
          >
            Tải mã QR
          </button>
        </div>
      </div>
    </div>
  )
}

export default QrModal
