import { useState } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { ChartTabs, PeriodSelect } from './ChartControls'
import { customerChart } from '../../data/mockData'

const TABS = [
  { id: 'hour', label: 'Theo giờ' },
  { id: 'day', label: 'Theo ngày' },
  { id: 'weekday', label: 'Theo thứ' },
]

const CustomerTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="kv-chart-tooltip">
      <div className="kv-chart-tooltip-label">{label}</div>
      <div className="kv-chart-tooltip-value">{Math.round(payload[0].value)} lượt khách</div>
    </div>
  )
}

const CustomerChart = () => {
  const [tab, setTab] = useState('hour')
  const data =
    tab === 'hour' ? customerChart.byHour
    : tab === 'day' ? customerChart.byDay
    : customerChart.byWeekday

  return (
    <Card size="lg" className="kv-chart-card">
      <CardHeader
        title={<span className="kv-chart-card-title">Lượng khách hàng</span>}
        actions={<PeriodSelect />}
      />
      <CardBody className="kv-chart-body">
        <div className="kv-chart-summary">
          <span className="kv-chart-summary-value">{customerChart.total} lượt khách</span>
        </div>

        <ChartTabs tabs={TABS} active={tab} onChange={setTab} />

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--kv-primary)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--kv-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--kv-border-subtle)" strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} dy={6} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} width={28} allowDecimals={false} />
            <Tooltip content={<CustomerTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--kv-primary)"
              strokeWidth={2}
              fill="url(#customerGrad)"
              dot={false}
              activeDot={{ r: 5, fill: 'var(--kv-primary)', stroke: 'var(--kv-white)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

export default CustomerChart
