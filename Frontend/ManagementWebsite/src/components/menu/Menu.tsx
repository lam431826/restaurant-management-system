import { useMemo, useState } from 'react'
import MenuFilters from './MenuFilters'
import MenuToolbar from './MenuToolbar'
import MenuTable from './MenuTable'
import AddItemModal from './AddItemModal'
import type { NewItemKind } from './AddItemModal'
import { products as initialProducts } from '../../data/mockData'
import type { Product } from '../../data/mockData'

const Menu = () => {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Product[]>(initialProducts)
  const [modalKind, setModalKind] = useState<NewItemKind | null>(null)

  const filtered = items.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  )

  // Next auto product code (SP000026, …) based on the highest existing number
  const nextCode = useMemo(() => {
    const max = items.reduce((m, p) => {
      const n = parseInt(p.code.replace(/\D/g, ''), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    return 'SP' + String(max + 1).padStart(6, '0')
  }, [items])

  const groups = useMemo(
    () => Array.from(new Set(items.map(p => p.group))).filter(Boolean),
    [items]
  )

  const handleSave = (product: Product, addAnother: boolean) => {
    setItems(prev => [product, ...prev])
    if (!addAnother) setModalKind(null)
  }

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[26rem] shrink-0 flex flex-col px-5 pt-5 pb-4 overflow-y-auto">
        <h1 className="text-h2 font-extrabold text-ink mb-5">Món</h1>
        <MenuFilters />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col pt-5 pr-5 gap-4">
        <MenuToolbar
          search={search}
          onSearch={setSearch}
          onNew={setModalKind}
          products={items}
        />
        <MenuTable products={filtered} total={items.length} />
      </section>

      {modalKind && (
        <AddItemModal
          kind={modalKind}
          nextCode={nextCode}
          groups={groups}
          onClose={() => setModalKind(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default Menu
