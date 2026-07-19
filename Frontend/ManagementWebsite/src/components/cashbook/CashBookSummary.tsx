const money = (value: number) => value.toLocaleString('vi-VN')

interface Props {
  openingBalance: number
  totalIncome: number
  totalExpense: number
}

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const CashBookSummary = ({ openingBalance, totalIncome, totalExpense }: Props) => {
  const closingBalance = openingBalance + totalIncome - totalExpense

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-2 py-3 shrink-0">
      <div className="min-w-[10rem]">
        <div className="text-sm text-ink-muted">Quỹ đầu kỳ</div>
        <div className="text-lg font-semibold text-ink mt-1">{money(openingBalance)}</div>
      </div>
      <div className="min-w-[10rem]">
        <div className="text-sm text-ink-muted">Tổng thu</div>
        <div className="text-lg font-semibold text-primary mt-1">{money(totalIncome)}</div>
      </div>
      <div className="min-w-[10rem]">
        <div className="text-sm text-ink-muted">Tổng chi</div>
        <div className="text-lg font-semibold text-danger mt-1">-{money(totalExpense)}</div>
      </div>
      <div className="min-w-[10rem]">
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          Tồn quỹ
          <span title="Tồn quỹ = Quỹ đầu kỳ + Tổng thu - Tổng chi"><InfoIcon /></span>
        </div>
        <div className="text-lg font-bold text-success mt-1">{money(closingBalance)}</div>
      </div>
    </div>
  )
}

export default CashBookSummary
