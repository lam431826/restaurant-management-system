import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { PeriodSelect, InfoIcon } from './ChartControls'
import { menuEffectiveness } from '../../data/mockData'

const fmt = (n: number) => n.toLocaleString('vi-VN')

const AVG_STATS = [
  { icon: '🍴', label: 'Giá trị trung bình/món', value: menuEffectiveness.avgPerItem, info: true },
  { icon: '🍔', label: 'Giá trị trung bình/đồ ăn', value: menuEffectiveness.avgPerFood, info: false },
  { icon: '🥤', label: 'Giá trị trung bình/đồ uống', value: menuEffectiveness.avgPerDrink, info: true },
]

const segBtn = (active: boolean) =>
  [
    'px-4 py-2 border-none rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer',
    active ? 'bg-primary text-white font-semibold' : 'bg-transparent text-ink-subtle font-medium',
  ].join(' ')

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="kv-chart-tooltip">
      <div className="kv-chart-tooltip-label">{p.name}</div>
      <div className="kv-chart-tooltip-value">{p.value}%</div>
    </div>
  )
}

const MenuEffectiveness = () => {
  const [view, setView] = useState<'group' | 'type'>('group')
  const [selectedGroup, setSelectedGroup] = useState('SÚP')
  const [groupOpen, setGroupOpen] = useState(false)

  const groups = menuEffectiveness.groups
  const detail = menuEffectiveness.detail[selectedGroup] ?? []

  return (
    <Card className="w-full">
      <CardHeader
        title="Hiệu quả thực đơn"
        actions={
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-fill rounded-full p-[0.3rem]">
              <button className={segBtn(view === 'group')} onClick={() => setView('group')}>
                Theo nhóm
              </button>
              <button className={segBtn(view === 'type')} onClick={() => setView('type')}>
                Theo loại
              </button>
            </div>
            <PeriodSelect />
          </div>
        }
      />
      <CardBody>
        {/* ── Average value stats ── */}
        <div className="grid grid-cols-3 max-[900px]:grid-cols-1 gap-4 pb-5 mb-4 border-b border-line">
          {AVG_STATS.map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-[2.4rem] leading-none shrink-0">{s.icon}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="inline-flex items-center gap-1 text-sm text-ink-subtle">
                  {s.label} {s.info && <InfoIcon size={12} />}
                </span>
                <span className="text-xl font-extrabold text-ink leading-[1.1]">{fmt(s.value)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[0.85fr_1.15fr] max-[900px]:grid-cols-1 gap-6 items-start">
          {/* ── Donut chart ── */}
          <div>
            <div className="text-md font-semibold text-ink mb-3">Nhóm món</div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={groups}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={1}
                    stroke="var(--kv-white)"
                    strokeWidth={2}
                  >
                    {groups.map(g => (
                      <Cell key={g.name} fill={g.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-y-2 gap-x-3 mt-3">
              {groups.map(g => (
                <div key={g.name} className="inline-flex items-center gap-1.5">
                  <span className="w-[1rem] h-[1rem] rounded-[0.2rem] shrink-0" style={{ background: g.color }} />
                  <span className="text-xs text-ink-subtle uppercase tracking-[0.02em]">{g.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Detail table ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-md font-semibold text-ink">Chi tiết từng nhóm món</span>
              <div className="relative">
                <button
                  className="flex items-center gap-2 h-[var(--kv-size-sm)] px-3 bg-card border border-line-default rounded-md text-sm font-medium text-ink cursor-pointer hover:border-line-strong"
                  onClick={() => setGroupOpen(o => !o)}
                >
                  <span>{selectedGroup}</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {groupOpen && (
                  <div className="absolute top-[calc(100%+0.4rem)] right-0 min-w-[16rem] bg-card border border-line-default rounded-md shadow-md py-1 z-[var(--kv-z-dropdown)]">
                    {groups.map(g => (
                      <div
                        key={g.name}
                        className={[
                          'px-4 py-2 text-sm cursor-pointer whitespace-nowrap hover:bg-[var(--kv-state-hover-bg)]',
                          g.name === selectedGroup ? 'text-primary font-medium' : 'text-ink',
                        ].join(' ')}
                        onClick={() => { setSelectedGroup(g.name); setGroupOpen(false) }}
                      >
                        {g.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[4rem] text-left text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">STT</th>
                  <th className="text-left text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">Top 10 món bán chạy</th>
                  <th className="text-right text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">Số lượng bán</th>
                  <th className="text-right text-sm font-medium text-ink-subtle px-3 py-2 border-b border-line whitespace-nowrap">Doanh thu thuần</th>
                </tr>
              </thead>
              <tbody>
                {detail.map(row => (
                  <tr key={row.rank} className="hover:bg-fill">
                    <td className="text-ink-subtle text-md px-3 py-3 border-b border-line">{row.rank}</td>
                    <td className="text-md text-ink px-3 py-3 border-b border-line">{row.name}</td>
                    <td className="text-right whitespace-nowrap text-md text-ink px-3 py-3 border-b border-line">{row.qty}</td>
                    <td className="text-right whitespace-nowrap text-md text-ink px-3 py-3 border-b border-line">{fmt(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-3 text-sm text-ink-subtle">
              <span>1-{detail.length} trong {detail.length}</span>
              <div className="flex gap-1">
                <button
                  className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled
                  aria-label="Trang trước"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  className="w-[2.8rem] h-[2.8rem] flex items-center justify-center border border-line-default rounded-xxs bg-card text-ink-subtle cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled
                  aria-label="Trang sau"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default MenuEffectiveness
