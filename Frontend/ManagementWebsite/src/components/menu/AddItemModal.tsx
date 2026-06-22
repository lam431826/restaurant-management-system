import { useEffect, useRef, useState } from 'react'
import type { Product } from '../../data/mockData'

/* ─── Types ──────────────────────────────────────────────────────────────── */
export type NewItemKind = 'mon' | 'topping' | 'dichvu' | 'combo'

interface KindConfig {
  title: string
  nameLabel: string
  /** show Giá vốn field */
  cost: boolean
  /** show the "Chọn loại món" preparation cards */
  prep: boolean
  /** show "Quản lý tồn tại Kho hàng" toggle */
  inventory: boolean
  /** show combo component picker */
  components: boolean
  defaultMenuType: string
}

const KIND_CONFIG: Record<NewItemKind, KindConfig> = {
  mon:     { title: 'Tạo món',            nameLabel: 'Tên món',     cost: true,  prep: true,  inventory: true,  components: false, defaultMenuType: 'Đồ ăn' },
  topping: { title: 'Tạo topping',        nameLabel: 'Tên topping', cost: true,  prep: false, inventory: true,  components: false, defaultMenuType: 'Khác' },
  dichvu:  { title: 'Tạo dịch vụ',        nameLabel: 'Tên dịch vụ', cost: false, prep: false, inventory: false, components: false, defaultMenuType: 'Dịch vụ' },
  combo:   { title: 'Tạo combo - buffet', nameLabel: 'Tên combo',   cost: false, prep: false, inventory: false, components: true,  defaultMenuType: 'Khác' },
}

const MENU_TYPES = ['Đồ ăn', 'Đồ uống', 'Dịch vụ', 'Khác']
const TAGS = ['Món mới', 'Bán chạy', 'Khuyến mãi', 'Đặc sản']

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted inline-block shrink-0">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
const ImagePlaceholderIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const TagIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)

/* ─── Field primitives ───────────────────────────────────────────────────── */
const inputCls =
  'w-full h-12 px-4 bg-field border border-line-default rounded-lg text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const FieldLabel = ({ children, required, info }: { children: React.ReactNode; required?: boolean; info?: boolean }) => (
  <span className="inline-flex items-center gap-1 text-md text-ink-subtle">
    {children}
    {required && <span className="text-danger">*</span>}
    {info && <InfoIcon />}
  </span>
)

/* Inline dropdown select */
const FormSelect = ({
  value, options, placeholder, onChange, footer, bold,
}: {
  value: string
  options: string[]
  placeholder?: string
  onChange: (v: string) => void
  footer?: { label: string; onClick: () => void }
  bold?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-full h-12 px-4 bg-field border rounded-lg cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? `text-ink ${bold ? 'font-semibold' : ''}` : 'text-ink-muted'} ${bold && !value ? 'mx-auto font-semibold' : ''}`}>
          {value || placeholder}
        </span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-lg shadow-md z-[var(--kv-z-dropdown)] max-h-[24rem] overflow-y-auto py-1">
          {options.map(opt => (
            <div
              key={opt}
              className={`px-4 py-2.5 text-md cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </div>
          ))}
          {footer && (
            <>
              <div className="h-px bg-line my-1" />
              <div className="px-4 py-2.5 text-md text-primary font-medium cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { footer.onClick(); setOpen(false) }}>
                + {footer.label}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* Money input (thousands separators) */
const MoneyInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const display = value === '' ? '' : Number(value).toLocaleString('vi-VN')
  return (
    <input
      className={`${inputCls} text-right`}
      inputMode="numeric"
      placeholder="0"
      value={display}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
    />
  )
}

/* Toggle switch */
const Switch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-neutral-200'}`}
    aria-pressed={on}
  >
    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
)

interface ComboLine { id: number; name: string; qty: number; price: number }

/* ─── Main modal ─────────────────────────────────────────────────────────── */
interface Props {
  kind: NewItemKind
  nextCode: string
  groups: string[]
  onClose: () => void
  onSave: (product: Product, addAnother: boolean) => void
}

const TABS = ['Thông tin', 'Mô tả chi tiết', 'Chi nhánh kinh doanh'] as const
type Tab = (typeof TABS)[number]

const AddItemModal = ({ kind, nextCode, groups, onClose, onSave }: Props) => {
  const cfg = KIND_CONFIG[kind]

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [group, setGroup] = useState('')
  const [tag, setTag] = useState('')
  const [menuType, setMenuType] = useState(cfg.defaultMenuType)
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [prep, setPrep] = useState<'che-bien' | 'thuong'>('thuong')
  const [trackStock, setTrackStock] = useState(false)
  const [allowSell, setAllowSell] = useState(true)
  const [image, setImage] = useState<string | null>(null)
  const [components, setComponents] = useState<ComboLine[]>([])
  const [tab, setTab] = useState<Tab>('Thông tin')
  const [error, setError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const pickImage = (file?: File) => {
    if (!file) return
    setImage(URL.createObjectURL(file))
  }

  const addComponentLine = () => setComponents(c => [...c, { id: Date.now(), name: '', qty: 1, price: 0 }])
  const updateComponent = (id: number, patch: Partial<ComboLine>) => setComponents(c => c.map(l => (l.id === id ? { ...l, ...patch } : l)))
  const removeComponent = (id: number) => setComponents(c => c.filter(l => l.id !== id))
  const comboTotal = components.reduce((s, l) => s + l.qty * l.price, 0)

  const itemType =
    kind === 'topping' ? 'Topping'
    : kind === 'dichvu' ? 'Dịch vụ'
    : kind === 'combo' ? 'Combo - Buffet'
    : prep === 'che-bien' ? 'Món chế biến' : 'Món thường'

  const buildProduct = (): Product | null => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên')
      setTab('Thông tin')
      nameRef.current?.focus()
      return null
    }
    const finalPrice = cfg.components ? (price === '' ? comboTotal : Number(price)) : Number(price || 0)
    return {
      code: code.trim() || nextCode,
      name: name.trim(),
      group: group || 'Chưa phân nhóm',
      menuType,
      itemType,
      price: finalPrice,
      img: image ?? '/assets/products/placeholder.jpg',
    }
  }

  const handleSave = (addAnother: boolean) => {
    const p = buildProduct()
    if (!p) return
    onSave(p, addAnother)
    if (addAnother) {
      setName(''); setCode(''); setGroup(''); setTag(''); setCost(''); setPrice('')
      setDescription(''); setImage(null); setComponents([]); setMenuType(cfg.defaultMenuType)
      setPrep('thuong'); setTrackStock(false); setError(''); setTab('Thông tin')
      nameRef.current?.focus()
    }
  }

  const Thumb = () => (
    <button type="button" onClick={() => fileRef.current?.click()} className="w-[3.6rem] h-[3.6rem] rounded-lg bg-fill border border-line-default flex items-center justify-center text-ink-disabled hover:border-primary hover:text-primary transition-colors">
      <ImagePlaceholderIcon size={18} />
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[100rem] my-4 bg-card rounded-xl shadow-lg flex flex-col max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 h-18 border-b border-line shrink-0">
          <h2 className="text-h2 font-bold text-ink">{cfg.title}</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 px-7 border-b border-line shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative h-12 text-md font-semibold cursor-pointer transition-colors ${tab === t ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
            >
              {t}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[0.25rem] bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6">
          {tab === 'Thông tin' && (
            <div className="flex gap-7">
              {/* Form column */}
              <div className="flex-1 min-w-0 flex flex-col gap-5">
                {/* Tên */}
                <div className="flex flex-col gap-2">
                  <FieldLabel required>{cfg.nameLabel}</FieldLabel>
                  <input
                    ref={nameRef}
                    className={inputCls}
                    placeholder="Bắt buộc"
                    value={name}
                    onChange={e => { setName(e.target.value); if (error) setError('') }}
                  />
                </div>

                {/* Nhóm món + Tag món */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Nhóm món</FieldLabel>
                      <button
                        type="button"
                        className="text-md font-medium text-primary hover:underline"
                        onClick={() => { const g = window.prompt('Tên nhóm món mới:')?.trim(); if (g) setGroup(g) }}
                      >
                        Tạo mới
                      </button>
                    </div>
                    <FormSelect
                      value={group}
                      options={groups}
                      placeholder="Chọn nhóm món"
                      onChange={setGroup}
                      footer={{ label: 'Tạo nhóm mới', onClick: () => { const g = window.prompt('Tên nhóm món mới:')?.trim(); if (g) setGroup(g) } }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel info>Tag món</FieldLabel>
                    <FormSelect value={tag} options={TAGS} placeholder="Chọn tag món" onChange={setTag} bold />
                  </div>
                </div>

                {/* Loại thực đơn + Mã món */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <FieldLabel>Loại thực đơn</FieldLabel>
                    <FormSelect value={menuType} options={MENU_TYPES} onChange={setMenuType} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel>Mã món</FieldLabel>
                    <input className={inputCls} placeholder="Tự động" value={code} onChange={e => setCode(e.target.value)} />
                  </div>
                </div>

                {/* Giá & Thuế card */}
                <div className="border border-line-default rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-ink">Giá &amp; Thuế</h3>
                    <div className="flex items-center gap-3 text-sm text-ink-subtle">
                      <span>Lợi nhuận ròng dự kiến: <span className="text-ink font-medium">-</span></span>
                      <span className="w-px h-4 bg-line" />
                      <span className="inline-flex items-center gap-1">Tỷ lệ giá vốn/giá trước thuế: <span className="text-ink font-medium">-</span> <InfoIcon /></span>
                    </div>
                  </div>
                  {cfg.cost && (
                    <div className="flex flex-col gap-2 max-w-[26rem]">
                      <FieldLabel info>Giá vốn</FieldLabel>
                      <MoneyInput value={cost} onChange={setCost} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[26rem]">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Giá bán</FieldLabel>
                      <button type="button" className="inline-flex items-center gap-1 text-md font-medium text-primary hover:underline" onClick={() => window.alert('Thiết lập giá theo bảng giá')}>
                        <TagIcon /> Thiết lập giá
                      </button>
                    </div>
                    <MoneyInput value={price} onChange={setPrice} />
                  </div>
                </div>

                {/* Chọn loại món */}
                {cfg.prep && (
                  <div className="border border-line-default rounded-xl p-5 flex flex-col gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-ink">Chọn loại món</h3>
                      <p className="text-md text-ink-subtle mt-0.5">Chọn cách món này được bán và trừ tồn kho</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {([
                        ['che-bien', 'Món chế biến', 'Món được chế biến theo công thức và trừ tồn nguyên liệu khi bán.', 'Cà phê, cơm suất.'],
                        ['thuong', 'Món thường', 'Món/hàng hóa nhập sẵn để bán và trừ tồn trực tiếp trên món.', 'Nước suối, snack.'],
                      ] as const).map(([id, title, desc, ex]) => {
                        const active = prep === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPrep(id)}
                            className={`text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${active ? 'border-primary bg-primary-50' : 'border-line-default bg-card hover:border-line-strong'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-md font-bold text-ink">{title}</p>
                              <p className="text-sm text-ink-subtle mt-1 leading-snug">{desc}</p>
                              <p className="text-sm text-ink-subtle mt-2"><span className="font-semibold text-ink">Ví dụ:</span> {ex}</p>
                            </div>
                            <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-primary' : 'border-line-strong'}`}>
                              {active && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quản lý tồn tại Kho hàng */}
                {cfg.inventory && (
                  <div className="border border-line-default rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-ink">Quản lý tồn tại Kho hàng</h3>
                      <p className="text-md text-ink-subtle mt-0.5">Theo dõi số lượng tồn kho của món này.</p>
                    </div>
                    <Switch on={trackStock} onToggle={() => setTrackStock(v => !v)} />
                  </div>
                )}

                {/* Combo components */}
                {cfg.components && (
                  <div className="border border-line-default rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-ink">Món thành phần</h3>
                      <button type="button" onClick={addComponentLine} className="kv-btn kv-btn-text-primary h-8">+ Thêm món</button>
                    </div>
                    {components.length === 0 ? (
                      <div className="text-md text-ink-muted py-4 text-center border border-dashed border-line-default rounded-lg">Chưa có món thành phần</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {components.map(l => (
                          <div key={l.id} className="grid grid-cols-[1fr_7rem_11rem_3.5rem] gap-2 items-center">
                            <input className="h-10 px-3 bg-field border border-line-default rounded-lg text-md text-ink focus:outline-none focus:border-primary" placeholder="Tên món" value={l.name} onChange={e => updateComponent(l.id, { name: e.target.value })} />
                            <input className="h-10 px-3 bg-field border border-line-default rounded-lg text-md text-ink text-center focus:outline-none focus:border-primary" inputMode="numeric" value={l.qty} onChange={e => updateComponent(l.id, { qty: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} />
                            <input className="h-10 px-3 bg-field border border-line-default rounded-lg text-md text-ink text-right focus:outline-none focus:border-primary" inputMode="numeric" placeholder="0" value={l.price === 0 ? '' : l.price.toLocaleString('vi-VN')} onChange={e => updateComponent(l.id, { price: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} />
                            <button type="button" onClick={() => removeComponent(l.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted cursor-pointer hover:text-danger hover:bg-danger-50"><TrashIcon /></button>
                          </div>
                        ))}
                        <div className="flex items-center justify-end gap-3 pt-1">
                          <span className="text-md text-ink-subtle">Tổng:</span>
                          <span className="text-md font-bold text-ink">{comboTotal.toLocaleString('vi-VN')} ₫</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Image column */}
              <div className="w-[24rem] shrink-0 flex gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative flex-1 aspect-square rounded-xl bg-fill flex flex-col items-center justify-center gap-2 text-ink-muted cursor-pointer transition-colors hover:bg-fill-default overflow-hidden"
                >
                  {image ? (
                    <>
                      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <button type="button" onClick={e => { e.stopPropagation(); setImage(null) }} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-[rgba(0,0,0,0.5)] text-white cursor-pointer hover:bg-[rgba(0,0,0,0.7)]" aria-label="Xóa ảnh">
                        <TrashIcon />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-4 py-1.5 rounded-lg bg-card border border-line-default text-md font-medium text-ink">Thêm ảnh</span>
                      <span className="text-md text-center px-4">Mỗi ảnh không quá 2 MB</span>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  {Array.from({ length: 4 }).map((_, i) => <Thumb key={i} />)}
                </div>
              </div>
            </div>
          )}

          {tab === 'Mô tả chi tiết' && (
            <div className="flex flex-col gap-2 max-w-[60rem]">
              <FieldLabel>Mô tả chi tiết</FieldLabel>
              <textarea className={`${inputCls} h-[28rem] py-3 resize-none`} placeholder="Nhập mô tả chi tiết cho món..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          )}

          {tab === 'Chi nhánh kinh doanh' && (
            <div className="border border-line-default rounded-xl overflow-hidden max-w-[60rem]">
              <div className="grid grid-cols-[1fr_12rem] gap-2 px-4 py-3 bg-primary-25 text-md font-semibold text-ink-strong">
                <span>Chi nhánh</span><span className="text-right">Giá bán</span>
              </div>
              <div className="grid grid-cols-[1fr_12rem] gap-2 px-4 py-3 items-center border-t border-line">
                <label className="kv-check"><input type="checkbox" defaultChecked /><span className="kv-check-box" /><span className="kv-check-text">Chi nhánh trung tâm</span></label>
                <span className="text-right text-md text-ink">{price ? Number(price).toLocaleString('vi-VN') : '0'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-7 h-18 border-t border-line shrink-0">
          <label className="kv-check">
            <input type="checkbox" checked={allowSell} onChange={() => setAllowSell(v => !v)} />
            <span className="kv-check-box" />
            <span className="kv-check-text inline-flex items-center gap-1">Cho phép bán <InfoIcon /></span>
          </label>
          <div className="flex items-center gap-3">
            {error && <span className="text-md text-danger mr-2">{error}</span>}
            <button className="kv-btn kv-btn-text-primary h-11 text-ink-subtle" onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-outline-neutral h-11" onClick={() => handleSave(true)}>Lưu &amp; Tạo thêm món</button>
            <button className="kv-btn kv-btn-primary h-11 px-6" onClick={() => handleSave(false)}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddItemModal
