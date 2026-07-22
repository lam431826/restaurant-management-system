import Card, { CardHeader, CardBody } from '../common/Card'
import { Skeleton, EmptyState, ErrorState } from './DashboardStates'
import { fmtCurrency, fmtInt, fmtPercent } from './dashboardUtils'
import { PAYMENT_METHOD_LABEL, type DashboardPaymentMethod } from '../../api/dashboard'
import type { OverviewState } from './Dashboard'

const METHOD_COLOR: Partial<Record<DashboardPaymentMethod, string>> = {
  CASH: 'var(--kv-success)',
  VNPAY: 'var(--kv-primary)',
  CARD: 'var(--kv-warning)',
  QR: 'var(--kv-primary-600)',
  E_WALLET: 'var(--kv-danger)',
}

const PaymentBreakdown = ({
  overview,
  onRetry,
}: {
  overview: OverviewState
  onRetry: () => void
}) => {
  const rows = overview.data?.paymentBreakdown ?? []
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const hasData = rows.length > 0 && total > 0

  return (
    <Card size="lg" className="h-full">
      <CardHeader title="Phương thức thanh toán" />
      <CardBody>
        {overview.loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : overview.error ? (
          <ErrorState onRetry={onRetry} />
        ) : !hasData ? (
          <EmptyState message="Chưa có giao dịch thanh toán" />
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map(row => {
              const pct = total > 0 ? (row.amount / total) * 100 : 0
              const color = METHOD_COLOR[row.method] ?? 'var(--kv-primary)'
              return (
                <div key={row.method} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="w-[1rem] h-[1rem] rounded-[0.3rem] shrink-0" style={{ background: color }} />
                      <span className="text-md font-medium text-ink truncate">
                        {PAYMENT_METHOD_LABEL[row.method] ?? row.method}
                      </span>
                      <span className="text-xs text-ink-muted shrink-0">
                        ({fmtInt(row.count)} GD)
                      </span>
                    </span>
                    <span className="text-md font-semibold text-ink whitespace-nowrap">
                      {fmtCurrency(row.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 h-[0.6rem] bg-fill rounded-full overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </span>
                    <span className="text-xs text-ink-subtle w-[3.4rem] text-right shrink-0">
                      {fmtPercent(pct)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-line">
              <span className="text-sm text-ink-subtle">Tổng đã thu</span>
              <span className="text-md font-extrabold text-ink">{fmtCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default PaymentBreakdown
