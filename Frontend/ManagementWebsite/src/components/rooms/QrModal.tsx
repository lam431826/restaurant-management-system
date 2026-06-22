import { useEffect } from 'react'
import type { Room } from '../../data/mockData'

interface Props {
  room: Room
  onClose: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/* Deterministic pseudo-QR: a 21×21 grid filled from a hash of the room name.
   Purely decorative — stands in for a real QR in this UI rebuild. */
const SIZE = 21
const buildGrid = (seedStr: string): boolean[][] => {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) % 1000) / 1000
  }
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) grid[r][c] = rand() > 0.5

  // Stamp the three finder squares (top-left, top-right, bottom-left)
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[r0 + r][c0 + c] = edge || core
      }
    // quiet border around finder
    for (let k = -1; k <= 7; k++) {
      if (grid[r0 + k]) { if (grid[r0 + k][c0 - 1] !== undefined) grid[r0 + k][c0 - 1] = false; if (grid[r0 + k][c0 + 7] !== undefined) grid[r0 + k][c0 + 7] = false }
      if (grid[r0 - 1]) grid[r0 - 1][c0 + k] = false
      if (grid[r0 + 7]) grid[r0 + 7][c0 + k] = false
    }
  }
  finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0)
  return grid
}

const QrModal = ({ room, onClose }: Props) => {
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

  const grid = buildGrid(`${room.id}-${room.name}-${room.area}`)
  const cell = 10
  const pad = 10
  const dim = SIZE * cell + pad * 2

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[40rem] my-6 bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Mã QR gọi món</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="text-md text-ink-subtle">
            <span className="font-semibold text-ink">{room.name}</span> · {room.area}
          </div>

          <div className="p-3 bg-white rounded-md border border-line-default">
            <svg width="240" height="240" viewBox={`0 0 ${dim} ${dim}`} role="img" aria-label={`Mã QR cho ${room.name}`}>
              <rect width={dim} height={dim} fill="#fff" />
              {grid.flatMap((rowArr, r) =>
                rowArr.map((on, c) =>
                  on ? <rect key={`${r}-${c}`} x={pad + c * cell} y={pad + r * cell} width={cell} height={cell} fill="#15171a" /> : null
                )
              )}
            </svg>
          </div>

          <p className="text-sm text-ink-muted text-center max-w-[28rem]">
            Khách quét mã để xem thực đơn và gọi món trực tiếp tại {room.name}.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Đóng</button>
          <button className="kv-btn kv-btn-primary h-10" onClick={() => window.alert(`Đang tải mã QR cho ${room.name}...`)}>
            Tải mã QR
          </button>
        </div>
      </div>
    </div>
  )
}

export default QrModal
