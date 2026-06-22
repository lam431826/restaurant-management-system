import { kpiData } from '../../data/mockData'
import CardGroup from '../common/CardGroup'
import Card, { CardHeader, CardBody } from '../common/Card'

const fmt = (n: number) => n.toLocaleString('vi-VN')

const InfoIcon = () => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="shrink-0 opacity-60"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const TrendArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" /><polyline points="9 7 17 7 17 15" />
  </svg>
)

const KPICards = () => {
  const { netRevenue, orders, tableRate } = kpiData

  return (
    <CardGroup size="lg" className="kv-dashboard-kpi">

      {/* ── Doanh thu hôm nay ── */}
      <Card variant="kpi" size="lg" accent="net-revenue">
        <CardHeader
          title="Doanh thu hôm nay"
          actions={
            <div className="kv-vat-badge">
              <span>Bao gồm VAT</span>
              <InfoIcon />
            </div>
          }
        />
        <CardBody>
          <div className="kv-kpi">
            <div className="kv-kpi-trend">
              <div className="kv-big-text">{fmt(netRevenue.today)}</div>
              <div className="kv-trend">
                <span className="kv-trend-pct kv-trend-pct-up">{netRevenue.trendPct}% <TrendArrow /></span>
                <span className="kv-trend-label">So với Hôm qua</span>
              </div>
            </div>
            <div className="kv-kpi-details">
              <div className="kv-form-group">
                <span className="kv-form-label">Giảm giá hóa đơn</span>
                <span className="kv-form-output">{fmt(netRevenue.discountAmount)}</span>
              </div>
              <div className="kv-form-group">
                <span className="kv-form-label">Trả hàng ({netRevenue.returnCount})</span>
                <span className="kv-form-output">{netRevenue.returns}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Số lượng đơn hôm nay ── */}
      <Card variant="kpi" size="lg" accent="total-orders">
        <CardHeader title="Số lượng đơn hôm nay" />
        <CardBody>
          <div className="kv-kpi">
            <div className="kv-kpi-trend">
              <span className="kv-big-text">{orders.today}</span>
              <div className="kv-trend">
                <span className="kv-trend-pct kv-trend-pct-up">{orders.trendPct}% <TrendArrow /></span>
                <span className="kv-trend-label">So với Hôm qua</span>
              </div>
            </div>
            <div className="kv-kpi-details">
              <div className="kv-form-group">
                <span className="kv-form-label">Trung bình đơn</span>
                <span className="kv-form-output">{fmt(orders.avgOrderValue)}</span>
              </div>
              <div className="kv-form-group">
                <span className="kv-form-label">Số khách/đơn</span>
                <span className="kv-form-output flex items-center gap-1">
                  {orders.customersPerOrder} <InfoIcon />
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Tỷ lệ phủ bàn ── */}
      <Card variant="kpi" size="lg" accent="new-customer">
        <CardHeader title="Tỷ lệ phủ bàn" />
        <CardBody>
          <div className="kv-kpi">
            <div className="kv-kpi-trend">
              <span className="kv-big-text">{tableRate.pct}%</span>
              <div className="kv-trend kv-trend-label">
                <span>{tableRate.activeTables}/{tableRate.totalTables} bàn đang sử dụng</span>
              </div>
            </div>
            <div className="kv-kpi-details">
              <div className="kv-form-group">
                <span className="kv-form-label">Đơn đang phục vụ ({tableRate.activeOrders})</span>
                <span className="kv-form-output">{tableRate.activeOrders}</span>
              </div>
              <div className="kv-form-group">
                <span className="kv-form-label">Khách đang phục vụ</span>
                <span className="kv-form-output">{tableRate.activeCustomers}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

    </CardGroup>
  )
}

export default KPICards
