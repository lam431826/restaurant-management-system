import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getVnpayStatus, reconcileVnpayPayment } from "../../services/paymentApi";
import type { VnpayStatusResult } from "../../services/paymentApi";
import { ApiClientError } from "../../services/apiClient";

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

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "kv-badge-warning",
  PAID: "kv-badge-success",
  FAILED: "kv-badge-danger",
  CANCELLED: "kv-badge-neutral",
  EXPIRED: "kv-badge-neutral",
};

const STATUS_HINTS: Record<string, string> = {
  PAID: "Hóa đơn đã được ghi nhận thanh toán. Bạn có thể quay lại màn hình thu ngân để đóng đơn.",
  FAILED: "Giao dịch không thành công. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
  CANCELLED: "Khách đã hủy giao dịch. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
  EXPIRED: "Giao dịch đã hết hạn. Hóa đơn vẫn chưa thanh toán, bạn có thể thu tiền mặt hoặc tạo giao dịch VNPAY mới.",
};

const money = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

// One-time cashier-return context, read by CashierOrders to restore the exact table/order.
// Router state is the primary channel; sessionStorage is a fallback for when a hard reload
// (or anything else that drops in-memory router state) happens between here and there —
// both are written from the same verified backend `result`, never from raw URL parameters.
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
  const pollStartRef = useRef(Date.now());

  const readErrorMessage = (thrown: unknown, fallback: string) =>
    thrown instanceof ApiClientError ? thrown.message : fallback;

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
    pollStartRef.current = Date.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const status = await runReconcile();
      if (cancelled) return;
      const stillPending = !status || !TERMINAL_STATUSES.has(status.status);
      const withinWindow = Date.now() - pollStartRef.current < POLL_TIMEOUT_MS;
      if (stillPending && withinWindow) {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
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
    Date.now() - pollStartRef.current < POLL_TIMEOUT_MS;

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-white rounded-[16px] shadow-sm p-6 flex flex-col gap-4">
        <h1 className="text-[20px] font-semibold text-[#202325] text-center">
          Kết quả thanh toán VNPAY Sandbox
        </h1>

        {checking && !result && (
          <p className="text-[14px] text-[#636566] text-center">
            Đang kiểm tra giao dịch với VNPAY...
          </p>
        )}

        {error && (
          <p className="text-[13px] text-[#d92d20] text-center" role="alert">
            {error}
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <span
                className={`kv-badge ${STATUS_BADGE_CLASS[result.status] ?? "kv-badge-neutral"}`}
              >
                {STATUS_LABELS[result.status] ?? result.status}
              </span>
            </div>

            {STATUS_HINTS[result.status] && (
              <p className="text-[12px] text-[#636566] text-center">
                {STATUS_HINTS[result.status]}
              </p>
            )}

            {autoPolling && (
              <p className="text-[12px] text-[#797b7c] text-center">
                Đang chờ xác nhận cuối cùng từ VNPAY, trang sẽ tự động cập nhật...
              </p>
            )}

            <div className="border-t border-[#e8e8e8] pt-3 flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#797b7c]">Mã hóa đơn</span>
                <span className="font-mono font-medium text-[#202325]">
                  {result.invoiceCode ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#797b7c]">Mã đơn hàng</span>
                <span className="font-mono font-medium text-[#202325]">
                  {result.orderCode ?? "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#797b7c]">Số tiền</span>
                <span className="font-medium text-[#202325]">
                  {money(result.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#797b7c]">Mã giao dịch</span>
                <span
                  className="font-mono text-[12px] text-[#202325]"
                  title={result.txnRef}
                >
                  {result.txnRef}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => void runReconcile()}
            disabled={checking}
            className="h-10 rounded-[10px] border border-[#025cca] text-[13px] font-medium text-[#025cca] disabled:opacity-50"
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
                  sessionStorage.setItem(
                    VNPAY_RETURN_STORAGE_KEY,
                    JSON.stringify(returnContext),
                  );
                } catch {
                  // sessionStorage unavailable (private mode, quota, etc.) — router state
                  // alone still carries the context for the common in-app navigation case.
                }
              }
              navigate("/cashier", { state: returnContext });
            }}
            className={`h-10 rounded-[10px] text-[13px] font-semibold text-white ${
              isPaid ? "bg-[#286b4a]" : "bg-[#025cca]"
            }`}
          >
            Quay lại màn hình thu ngân
          </button>
        </div>
      </div>
    </div>
  );
};

export default VnpayResultPage;
