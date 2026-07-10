import { useRef, useState } from 'react'
import type { NewItemKind } from './AddItemModal'
import NewItemMenu from './NewItemMenu'
import { importCsv, exportCsv } from '../../services/menuService'
import type { ImportResult } from '../../services/menuService'
import { ApiError } from '../../services/api'

interface Props {
  search: string
  onSearch: (v: string) => void
  onNew: (kind: NewItemKind) => void
  onImported: () => void
  onError: (msg: string) => void
}

const iconBtn = 'w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer shrink-0 transition-colors hover:border-primary hover:text-primary'

const MenuToolbar = ({ search, onSearch, onNew, onImported, onError }: Props) => {
  const importRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleExport = async () => {
    setBusy(true)
    try {
      await exportCsv()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Xuất file thất bại.')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const res = await importCsv(file)
      setResult(res)
      onImported()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Nhập file thất bại.')
    } finally {
      setBusy(false)
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
            className="w-full h-12 pl-[4.4rem] pr-4 bg-card border border-line rounded-full text-md text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]"
            placeholder="Theo mã hoặc tên món"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <NewItemMenu onSelect={onNew} />

          <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" disabled={busy} onClick={() => importRef.current?.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>

          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" disabled={busy} onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Xuất file
          </button>

          <button className={iconBtn} aria-label="Trợ giúp" title="Định dạng CSV: code,name,category,price,costPrice,description,imageUrl,menuType,itemType,tag,trackStock,status. Bỏ trống code sẽ được cấp mã tự động (SP…).">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {result && (
        <div className="px-4 py-2 rounded-md bg-primary-25 text-md text-ink border border-line">
          <div className="flex items-center justify-between">
            <span>Nhập xong: <b>{result.created}</b> mới, <b>{result.updated}</b> cập nhật, <b>{result.failed}</b> lỗi.</span>
            <button className="text-sm text-primary hover:underline" onClick={() => setResult(null)}>Đóng</button>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc list-inside text-sm text-danger max-h-32 overflow-y-auto">
              {result.errors.map(err => <li key={err.row}>Dòng {err.row}: {err.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default MenuToolbar
