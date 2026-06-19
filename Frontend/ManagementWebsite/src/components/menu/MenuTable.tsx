import { useState } from 'react'
import type { Product } from '../../data/mockData'

const Star = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'var(--kv-warning)' : 'none'} stroke={filled ? 'var(--kv-warning)' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const th = 'sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap'
const td = 'text-md text-ink px-3 py-2 border-b border-line align-middle'

interface Props {
  products: Product[]
  total: number
}

const MenuTable = ({ products, total }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState<Set<string>>(new Set())

  const allSelected = products.length > 0 && selected.size === products.length

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map(p => p.code)))

  const toggleRow = (code: string) =>
    setSelected(s => {
      const next = new Set(s)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })

  const toggleStar = (code: string) =>
    setStarred(s => {
      const next = new Set(s)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className={`${th} w-[4.5rem] text-center`}>
                <label className="kv-check justify-center">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="kv-check-box" />
                </label>
              </th>
              <th className={`${th} w-[4rem] text-center`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-45 inline">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </th>
              <th className={`${th} w-[5.5rem]`} />
              <th className={`${th} w-[11rem]`}>Mã món</th>
              <th className={th}>Tên món</th>
              <th className={`${th} w-[17rem]`}>Nhóm món</th>
              <th className={`${th} w-[14rem]`}>Loại thực đơn</th>
              <th className={`${th} w-[14rem]`}>Loại món</th>
              <th className={`${th} w-[11rem] text-right`}>Giá bán</th>
            </tr>
          </thead>
          <tbody>
            {/* Summary row */}
            <tr className="bg-card [&>td]:h-[3.6rem]">
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={`${td} text-right font-bold text-ink`}>0</td>
            </tr>

            {products.map(p => (
              <tr
                key={p.code}
                className={selected.has(p.code) ? 'bg-primary-50' : 'hover:bg-primary-25'}
              >
                <td className={`${td} text-center`}>
                  <label className="kv-check justify-center">
                    <input type="checkbox" checked={selected.has(p.code)} onChange={() => toggleRow(p.code)} />
                    <span className="kv-check-box" />
                  </label>
                </td>
                <td className={`${td} text-center`}>
                  <button
                    className="inline-flex items-center justify-center text-ink-muted cursor-pointer hover:text-warning"
                    onClick={() => toggleStar(p.code)}
                    aria-label="Đánh dấu"
                  >
                    <Star filled={starred.has(p.code)} />
                  </button>
                </td>
                <td className={td}>
                  <img src={p.img} alt="" className="w-10 h-10 rounded-sm object-cover border border-line" loading="lazy" />
                </td>
                <td className={td}>{p.code}</td>
                <td className={td}>{p.name}</td>
                <td className={td}>{p.group}</td>
                <td className={td}>{p.menuType}</td>
                <td className={td}>
                  <span className="inline-flex items-center text-sm text-ink-subtle border border-line-default rounded-xxs px-2 py-[0.2rem] whitespace-nowrap">{p.itemType}</span>
                </td>
                <td className={`${td} text-right`}>{p.price.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 border-t border-line shrink-0">
        <span className="text-md text-ink-subtle">1-{products.length} trong {total}</span>
        <div className="flex gap-1">
          <button className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" disabled aria-label="Trang trước">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" disabled aria-label="Trang sau">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuTable
