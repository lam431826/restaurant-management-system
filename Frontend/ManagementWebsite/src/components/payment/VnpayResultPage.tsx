import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getVnpayStatus, reconcileVnpayPayment } from "../../services/paymentApi";
import type { VnpayStatusResult } from "../../services/paymentApi";
import { ApiError } from "../../services/api";

// Terminal states stop polling; PENDING keeps polling until one of these or the timeout.
const TERMINAL_STATUSES = new Set(["PAID", "FAILED", "CANCELLED", "EXPIRED"]);

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 60000;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang chờ xác nhận từ VNPAY",
  PAID: "Thanh toán thành công",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Giao dịch đã bị hủy",
  EXPIRED: "Giao dịch đã hết hạn",
};

const CheckIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CrossIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ClockIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
  </svg>
);

/**
 * The outcome is the whole point of this page, so each status drives a full visual
 * treatment (icon + colour + emphasis) rather than the small text badge it used to be.
 */
const STATUS_VISUAL: Record<
  string,
  { icon: ComponentType; ring: string; fg: string }
> = {
  PENDING: { icon: ClockIcon, ring: "bg-warning-50 text-warning-700", fg: "text-warning-700" },
  PAID: { icon: CheckIcon, ring: "bg-success-50 text-success-700", fg: "text-success-700" },
  FAILED: { icon: CrossIcon, ring: "bg-danger-50 text-danger-700", fg: "text-danger-700" },
  CANCELLED: { icon: CrossIcon, ring: "bg-fill text-ink-subtle", fg: "text-ink-strong" },
  EXPIRED: { icon: ClockIcon, ring: "bg-fill text-ink-subtle", fg: "text-ink-strong" },
};

const STATUS_VISUAL_FALLBACK = STATUS_VISUAL.CANCELLED;

const STATUS_HINTS: Record<string, string> = {
  PAID: "Hóa đơn đã được ghi nhận thanh toán. Bạn có thể quay lại màn hình thu ngân để đóng đơn.",
  FAILED: "Giao dịch không thành công. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
  CANCELLED: "Khách đã hủy giao dịch. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
  EXPIRED: "Giao dịch đã hết hạn. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
};

const money = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

// One-time cashier-return context, read by CashierOrders to restore the exact table/order.
// Router state is the primary channel for a same-tab return; localStorage (not
// sessionStorage) is the fallback — required both for a hard reload dropping in-memory
// router state, AND for the common case now: this page usually runs in a separate tab opened
// via window.open() (see CashierOrders' handleInitiateVnpay), which closes itself instead of
// navigating, so localStorage is the only channel that reaches back into the original
// cashier tab (sessionStorage is per-tab and would never be visible there). Both channels are
// written from the same verified backend `result`, never from raw URL parameters.
const VNPAY_RETURN_STORAGE_KEY = "vnpay_return_context";

/**
 * Landing page after the VNPAY redirect round-trip.
 *
 * Never reads the vnp_* query parameters VNPAY appended to the Return URL — only txnRef,
 * purely to ask our own backend what happened. Because VNPAY cannot deliver IPN to
 * localhost, the page actively asks the backend to reconcile via QueryDR rather than
 * waiting for a callback that will never arrive.
 */
const VnpayResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txnRef = searchParams.get("txnRef") ?? "";

  const [result, setResult] = useState<VnpayStatusResult | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [pollingWindowOpen, setPollingWindowOpen] = useState(true);

  // True when this tab was opened via window.open() from the cashier screen (see
  // handleInitiateVnpay) rather than navigated to directly. In that case the cashier's
  // original tab is still alive with the same table/invoice selected, so the right "return"
  // action is closing this tab, not navigating it to /cashier (which would just open a
  // second, unauthenticated-feeling cashier screen in what's meant to be a throwaway tab).
  const openedAsPopup =
    typeof window !== "undefined" && !!window.opener && window.opener !== window;

  const readErrorMessage = (thrown: unknown, fallback: string) =>
    thrown instanceof ApiError ? thrown.message : fallback;

  /** Asks VNPAY (server-side QueryDR) and then reflects whatever the backend settled on. */
  const runReconcile = useCallback(async (): Promise<VnpayStatusResult | null> => {
    if (!txnRef) {
      setError("Không xác định được mã giao dịch.");
      setChecking(false);
      return null;
    }
    setChecking(true);
    try {
      const reconciled = await reconcileVnpayPayment(txnRef);
      setResult(reconciled);
      setError("");
      return reconciled;
    } catch (reconcileError) {
      // Reconciliation is the only way to learn a localhost-IPN transaction's real
      // outcome, but a gateway outage should still leave the last known status visible.
      setError(
        readErrorMessage(reconcileError, "Không thể kiểm tra giao dịch với VNPAY."),
      );
      try {
        const fallback = await getVnpayStatus(txnRef);
        setResult(fallback);
        return fallback;
      } catch {
        return null;
      }
    } finally {
      setChecking(false);
    }
  }, [txnRef]);

  // On load: reconcile once, then keep polling only while genuinely PENDING.
  useEffect(() => {
    const pollStartedAt = Date.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const status = await runReconcile();
      if (cancelled) return;
      const stillPending = !status || !TERMINAL_STATUSES.has(status.status);
      const withinWindow = Date.now() - pollStartedAt < POLL_TIMEOUT_MS;
      if (stillPending && withinWindow) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } else {
        setPollingWindowOpen(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runReconcile]);

  const status = result?.status ?? null;
  const isPaid = status === "PAID";
  const autoPolling =
    status !== null &&
    !TERMINAL_STATUSES.has(status) &&
    pollingWindowOpen;

  // An unrecognised status falls back to the neutral treatment, not the amber "pending" one,
  // so an unexpected value can never be mistaken for a transaction still in flight.
  const visual = STATUS_VISUAL[status ?? ""] ?? STATUS_VISUAL_FALLBACK;
  const StatusIcon = result ? visual.icon : ClockIcon;
  // The page always exposes exactly one <h1>, in every state — while checking, and when a
  // hard failure (e.g. a missing txnRef) means no result ever arrives.
  const headline = result
    ? (STATUS_LABELS[result.status] ?? result.status)
    : checking
      ? "Đang kiểm tra giao dịch"
      : "Kết quả thanh toán";

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-[46rem] bg-card rounded-lg border border-line shadow-sm p-8 flex flex-col gap-5">
        <p className="text-sm font-medium text-ink-muted text-center tracking-wide uppercase">
          VNPAY Sandbox
        </p>

        <div className="flex flex-col items-center gap-3">
          {/* The outcome leads the page — icon, then headline, then the amount. */}
          <span
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              result
                ? visual.ring
                : `bg-fill text-ink-subtle ${checking ? "animate-pulse" : ""}`
            }`}
          >
            <StatusIcon />
          </span>
          <h1
            className={`text-h3 font-bold text-center m-0 ${
              result ? visual.fg : "text-ink-strong"
            }`}
          >
            {headline}
          </h1>
          {!result && checking && (
            <p className="text-md text-ink-subtle text-center">
              Đang đối chiếu giao dịch với VNPAY...
            </p>
          )}
        </div>

        {result && (
          <div className="flex flex-col items-center gap-3">
            {STATUS_HINTS[result.status] && (
              <p className="text-md text-ink-subtle text-center leading-relaxed max-w-[36rem]">
                {STATUS_HINTS[result.status]}
              </p>
            )}

            {autoPolling && (
              <p className="text-sm text-ink-muted text-center">
                Đang chờ xác nhận cuối cùng từ VNPAY, trang sẽ tự động cập nhật...
              </p>
            )}

            <div className="w-full rounded-md bg-fill/60 px-5 py-4 flex flex-col items-center gap-1 mt-1">
              <span className="text-sm text-ink-subtle">Số tiền giao dịch</span>
              <span className="kv-big-text">{money(result.amount)}</span>
            </div>

            <div className="w-full border-t border-line pt-4 mt-1 flex flex-col gap-2.5 text-md">
              <div className="flex justify-between gap-4">
                <span className="text-ink-subtle shrink-0">Mã hóa đơn</span>
                <span className="font-mono font-semibold text-ink text-right break-all">
                  {result.invoiceCode ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-subtle shrink-0">Mã đơn hàng</span>
                <span className="font-mono text-ink text-right break-all">
                  {result.orderCode ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink-subtle shrink-0">Mã giao dịch</span>
                <span
                  className="font-mono text-sm text-ink-subtle text-right break-all"
                  title={result.txnRef}
                >
                  {result.txnRef}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger-700 bg-danger-50 rounded-md px-4 py-2.5 text-center" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => void runReconcile()}
            disabled={checking}
            className="kv-btn kv-btn-outline-neutral h-11 bg-card w-full justify-center"
          >
            {checking ? "Đang kiểm tra với VNPAY..." : "Kiểm tra lại"}
          </button>
          <button
            type="button"
            onClick={() => {
              const returnContext = result
                ? {
                    tableId: result.tableId,
                    orderId: result.orderId,
                    invoiceId: result.invoiceId,
                    txnRef: result.txnRef,
                    paymentResult: result.status,
                    amount: result.amount,
                  }
                : undefined;
              if (returnContext) {
                try {
                  localStorage.setItem(
                    VNPAY_RETURN_STORAGE_KEY,
                    JSON.stringify(returnContext),
                  );
                } catch {
                  // localStorage unavailable (private mode, quota, etc.) — router state
                  // alone still carries the context for the common in-app navigation case;
                  // the cross-tab popup case has no other fallback if this fails.
                }
              }
              if (openedAsPopup) {
                // The cashier tab is still open behind this one — bring it to front (its own
                // "focus" listener picks up the localStorage context written above) instead
                // of navigating this throwaway tab to a second cashier screen. Focusing
                // first, before closing, is what actually determines which tab the browser
                // switches to next when many tabs are open — window.close() alone does not
                // reliably return to the opener.
                window.opener?.focus?.();
                window.close();
                return;
              }
              navigate("/cashier", { state: returnContext });
            }}
            className={`kv-btn h-11 w-full justify-center text-white ${
              isPaid
                ? "bg-success hover:bg-success-600"
                : "bg-primary hover:bg-primary-600"
            }`}
          >
            {openedAsPopup ? "Đóng và quay lại màn hình thu ngân" : "Quay lại màn hình thu ngân"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VnpayResultPage;
