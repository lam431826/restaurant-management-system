import { useState } from 'react'
import { downloadAllQrCodes, listTables } from '../../services/tableService'

interface Props {
  search: string
  onSearch: (v: string) => void
  onAdd: () => void
  onError: (msg: string) => void
}

const RoomToolbar = ({ search, onSearch, onAdd, onError }: Props) => {
  const [qrBusy, setQrBusy] = useState(false)

  const handleDownloadAllQr = async () => {
    setQrBusy(true)
    try {
      const all = await listTables()
      if (all.every(r => !r.qrToken)) {
        onError('Chưa có phòng/bàn nào có mã QR.')
        return
      }
      await downloadAllQrCodes(all)
    } catch {
      onError('Tải mã QR thất bại.')
    } finally {
      setQrBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 relative flex items-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 text-ink-muted pointer-events-none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full h-12 pl-[4.4rem] pr-12 bg-card border border-line rounded-full text-md text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]"
            placeholder="Theo tên phòng bàn, số ghế"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="kv-btn kv-btn-primary h-10" onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm phòng/bàn
          </button>

          <button
            className="kv-btn kv-btn-outline-neutral h-10 bg-card"
            disabled={qrBusy}
            onClick={() => void handleDownloadAllQr()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {qrBusy ? 'Đang tải mã QR...' : 'Tải tất cả mã QR'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomToolbar
