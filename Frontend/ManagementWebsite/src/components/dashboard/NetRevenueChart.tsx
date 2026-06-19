import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { ChartTabs, PeriodSelect, InfoIcon, MoneyTooltip } from './ChartControls'
import { netRevenueChart } from '../../data/mockData'

const TABS = [
  { id: 'hour', label: 'Theo giờ' },
  { id: 'day', label: 'Theo ngày' },
  { id: 'weekday', label: 'Theo thứ' },
]

const fmtAxis = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)} Tr` : v >= 1_000 ? `${v / 1_000}k` : `${v}`

const NetRevenueChart = () => {
  const [tab, setTab] = useState('hour')
  const data =
    tab === 'hour' ? netRevenueChart.byHour
    : tab === 'day' ? netRevenueChart.byDay
    : netRevenueChart.byWeekday

  return (
    <Card size="lg" className="kv-chart-card">
      <CardHeader
        title={<span className="kv-chart-card-title">Doanh thu thuần <InfoIcon /></span>}
        actions={<PeriodSelect />}
      />
      <CardBody className="kv-chart-body">
        <div className="kv-chart-summary">
          <span className="kv-chart-summary-value">
            {netRevenueChart.total.toLocaleString('vi-VN')}
          </span>
          <span className="kv-chart-summary-sub">({netRevenueChart.invoiceCount} hóa đơn)</span>
        </div>

        <ChartTabs tabs={TABS} active={tab} onChange={setTab} />

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={22} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--kv-border-subtle)" strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} dy={6} />
            <YAxis tickFormatter={fmtAxis} axisLine={false} tickLine={false} tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} width={42} />
            <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgba(0,112,244,0.06)' }} />
            <Bar dataKey="value" fill="var(--kv-primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

export default NetRevenueChart
