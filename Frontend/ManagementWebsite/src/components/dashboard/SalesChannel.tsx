import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { ChartTabs, PeriodSelect, InfoIcon, MoneyTooltip } from './ChartControls'
import { salesChannel } from '../../data/mockData'

const TABS = [
  { id: 'hour', label: 'Theo giờ' },
  { id: 'day', label: 'Theo ngày' },
  { id: 'weekday', label: 'Theo thứ' },
]

const fmtAxis = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} Tr` : v >= 1_000 ? `${v / 1_000}k` : `${v}`

const SalesChannel = () => {
  const [tab, setTab] = useState('hour')
  const data =
    tab === 'hour' ? salesChannel.byHour
    : tab === 'day' ? salesChannel.byDay
    : salesChannel.byWeekday

  return (
    <Card size="lg" className="kv-chart-card w-full">
      <CardHeader
        title={<span className="kv-chart-card-title">Kênh bán hàng <InfoIcon /></span>}
        actions={
          <div className="flex items-center gap-2">
            <PeriodSelect />
            <button
              className="w-8 h-8 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary"
              aria-label="Tùy chọn biểu đồ"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </button>
          </div>
        }
      />
      <CardBody className="kv-chart-body">
        <ChartTabs tabs={TABS} active={tab} onChange={setTab} />

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--kv-border-subtle)" strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} dy={6} />
            <YAxis tickFormatter={fmtAxis} axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} width={42} />
            <Tooltip content={<MoneyTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="plainline"
              formatter={() => <span className="text-sm text-ink-subtle">Khách đến trực tiếp</span>}
            />
            <Line
              type="monotone"
              dataKey="value"
              name="Khách đến trực tiếp"
              stroke="var(--kv-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--kv-primary)', stroke: 'var(--kv-white)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

export default SalesChannel
