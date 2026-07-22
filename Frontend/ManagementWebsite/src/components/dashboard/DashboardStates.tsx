// Shared loading / empty / error primitives so every dashboard widget handles the three states
// consistently and never renders NaN / undefined / a broken chart.

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-fill ${className}`} />
)

export const EmptyState = ({
  message,
  hint,
}: {
  message: string
  hint?: string
}) => (
  <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
    <svg width="44" height="44" viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="8" y="14" width="48" height="36" rx="4" stroke="var(--kv-border-strong)" strokeWidth="2" />
      <path d="M8 24h48" stroke="var(--kv-border-strong)" strokeWidth="2" />
      <path d="M18 36h12" stroke="var(--kv-border-strong)" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <p className="text-sm text-ink-muted m-0">{message}</p>
    {hint && <p className="text-xs text-ink-muted m-0">{hint}</p>}
  </div>
)

export const ErrorState = ({
  message = 'Không thể tải dữ liệu.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) => (
  <div className="flex flex-col items-center justify-center gap-3 text-center py-8 px-4">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--kv-danger)" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <p className="text-sm text-ink-subtle m-0">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="h-8 px-4 rounded-md border border-line-default text-sm font-medium text-primary hover:border-primary cursor-pointer bg-card"
      >
        Thử lại
      </button>
    )}
  </div>
)
