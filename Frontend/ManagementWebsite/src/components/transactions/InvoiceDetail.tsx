import { useCallback, useEffect, useState } from "react";
import type { InvoiceDetail as InvoiceDetailData } from "../../services/invoiceApi";
import { sendInvoice } from "../../services/invoiceApi";
import { getPayments } from "../../services/paymentApi";
import type { Payment, PaymentMethod } from "../../services/paymentApi";
import { getStoredUser } from "../../services/tokenStorage";
import { ApiClientError } from "../../services/apiClient";
import {
  getLifecycleBadgeClass,
  getLifecycleLabel,
  getPaymentBadgeClass,
  getPaymentLabel,
} from "./invoiceLifecycle";

interface Props {
  invoice: InvoiceDetailData;
  historyRefreshVersion: number;
}

const money = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const th =
  "bg-primary-25 text-left text-sm font-semibold text-ink-strong px-3 py-2 whitespace-nowrap";
const td = "text-md text-ink px-3 py-2 border-b border-line align-middle";

const INVOICE_ACTION_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  ORDER_ALREADY_INVOICED:
    "Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.",
  INVOICE_ALREADY_PAID: "Hóa đơn này đã được thanh toán.",
  ORDER_NOT_PAYABLE: "Không thể thanh toán đơn đã đóng hoặc đã hủy.",
  INVALID_INVOICE_TOTAL: "Hóa đơn có tổng tiền không hợp lệ.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const INVOICE_ACTION_MESSAGE_FALLBACKS: Record<string, string> = {
  "Invoice not found": INVOICE_ACTION_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": INVOICE_ACTION_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Invoice has already been paid":
    INVOICE_ACTION_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "A paid payment already exists for this invoice":
    INVOICE_ACTION_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  "Order cannot be paid in its current status":
    INVOICE_ACTION_ERROR_MESSAGES.ORDER_NOT_PAYABLE,
  "Invoice subtotal must be greater than zero and total amount cannot be negative":
    INVOICE_ACTION_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  "Validation failed": INVOICE_ACTION_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": INVOICE_ACTION_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    INVOICE_ACTION_ERROR_MESSAGES.BAD_REQUEST,
};

const SEND_INVOICE_SUCCESS_MESSAGE =
  "Đã ghi nhận gửi hóa đơn mô phỏng";
const SEND_INVOICE_FALLBACK_ERROR =
  "Không thể gửi hóa đơn. Vui lòng thử lại.";
const PAYMENT_HISTORY_FALLBACK_ERROR =
  "Không thể tải lịch sử thanh toán.";

const getInvoiceActionErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof ApiClientError && error.code) {
    return INVOICE_ACTION_ERROR_MESSAGES[error.code] ?? fallbackMessage;
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(INVOICE_ACTION_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? fallbackMessage;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  QR: "Mã QR",
  E_WALLET: "Ví điện tử",
};

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const InvoiceDetail = ({
  invoice,
  historyRefreshVersion,
}: Props) => {
  const totalQuantity = invoice.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError("");
    try {
      setPayments(await getPayments(invoice.id));
    } catch (loadError) {
      setPaymentsError(
        getInvoiceActionErrorMessage(loadError, PAYMENT_HISTORY_FALLBACK_ERROR),
      );
    } finally {
      setPaymentsLoading(false);
    }
  }, [invoice.id]);

  useEffect(() => {
    void loadPayments();
  }, [historyRefreshVersion, loadPayments]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setActionMessage({
        type: "error",
        text: "Trình duyệt đã chặn cửa sổ in hóa đơn",
      });
      return;
    }

    const itemRows = invoice.items
      .map(
        (item) => `
      <div class="item-row">
        <span class="item-name">${escapeHtml(item.menuItemName)}</span>
        <span class="item-calculation">${item.quantity} x ${escapeHtml(money(item.unitPrice))}</span>
        <strong>${escapeHtml(money(item.lineTotal))}</strong>
      </div>
    `,
      )
      .join("");
    const printedAt = formatDateTime(new Date().toISOString());
    const cashierName = getStoredUser()?.fullName || "Thu ngân";

    printWindow.document.write(`
      <!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Hóa đơn ${escapeHtml(invoice.id)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #f8f5ed; color: #202325; font-family: "Courier New", monospace; }
            .receipt { width: 380px; max-width: 100%; margin: 24px auto; padding: 24px 22px; background: #fffdf7; }
            .header { text-align: center; }
            h1 { margin: 0; font-family: Georgia, serif; font-size: 27px; letter-spacing: 1px; }
            .printed-at { margin: 7px 0 0; color: #636566; font-size: 12px; }
            .separator { margin: 20px 0; border-top: 1px dashed #8d8d88; }
            .order-box { padding: 12px; border: 1px dashed #8d8d88; text-align: center; }
            .order-box span { display: block; margin-bottom: 5px; color: #636566; font-size: 12px; text-transform: uppercase; }
            .order-box strong { font-size: 17px; overflow-wrap: anywhere; }
            .info-row, .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; font-size: 12px; }
            .info-row span:first-child, .total-row span:first-child { color: #636566; }
            .info-row strong { text-align: right; font-weight: 600; }
            .items-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; padding-bottom: 7px; color: #636566; font-size: 11px; text-transform: uppercase; }
            .item-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: start; padding: 9px 0; font-size: 12px; }
            .item-name { overflow-wrap: anywhere; }
            .item-calculation { white-space: nowrap; color: #636566; }
            .empty { padding: 12px 0; text-align: center; color: #636566; font-size: 12px; }
            .total-row { font-size: 13px; }
            .grand-total { margin-top: 7px; padding-top: 10px; border-top: 1px solid #202325; font-size: 16px; font-weight: 700; }
            .grand-total span { color: #202325 !important; }
            .footer { text-align: center; font-size: 12px; line-height: 1.7; }
            .brand { margin-top: 8px; font-family: Georgia, serif; font-size: 17px; font-weight: 700; }
            @media print { body { background: #fff; } .receipt { width: 100%; margin: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <main class="receipt">
            <header class="header"><h1>Wasabi Sushi</h1><p class="printed-at">${escapeHtml(printedAt)}</p></header>
            <div class="separator"></div>
            <section class="order-box"><span>Mã đơn hàng</span><strong>${escapeHtml(invoice.orderId)}</strong></section>
            <div class="separator"></div>
            <section>
              <div class="info-row"><span>Thu ngân</span><strong>${escapeHtml(cashierName)}</strong></div>
              <div class="info-row"><span>Ca làm</span><strong>08:00 - 17:00</strong></div>
              <div class="info-row"><span>Khách hàng</span><strong>Khách</strong></div>
              <div class="info-row"><span>Mã thành viên</span><strong>-</strong></div>
              <div class="info-row"><span>Hình thức</span><strong>Tại bàn</strong></div>
              <div class="info-row"><span>Số bàn</span><strong>-</strong></div>
            </section>
            <div class="separator"></div>
            <section>
              <div class="items-heading"><span>Món</span><span>SL x Giá</span><span>Thành tiền</span></div>
              ${itemRows || '<div class="empty">Không có món</div>'}
            </section>
            <div class="separator"></div>
            <section>
              <div class="total-row"><span>Tạm tính</span><strong>${escapeHtml(money(invoice.subtotal))}</strong></div>
              <div class="total-row"><span>Giảm giá</span><strong>${escapeHtml(money(invoice.discountAmount))}</strong></div>
              <div class="total-row grand-total"><span>Tổng thanh toán</span><strong>${escapeHtml(money(invoice.totalAmount))}</strong></div>
            </section>
            <div class="separator"></div>
            <footer class="footer"><div>Cảm ơn quý khách. Hẹn gặp lại!</div><div class="brand">Wasabi Sushi</div></footer>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSend = async () => {
    setSending(true);
    setActionMessage(null);
    try {
      const response = await sendInvoice(invoice.id);
      setActionMessage({
        type: "success",
        text: `${SEND_INVOICE_SUCCESS_MESSAGE} lúc ${formatDateTime(
          response.sentAt,
        )}.`,
      });
    } catch (sendError) {
      setActionMessage({
        type: "error",
        text: getInvoiceActionErrorMessage(
          sendError,
          SEND_INVOICE_FALLBACK_ERROR,
        ),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border-x border-b border-primary-150 px-5 pb-5 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 border-b border-line">
        <div>
          <div className="text-sm text-ink-muted">Mã hóa đơn</div>
          <div className="text-md font-semibold text-ink mt-1 break-all">
            {invoice.id}
          </div>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Mã đơn hàng</div>
          <div className="text-md font-semibold text-ink mt-1 break-all">
            {invoice.orderId}
          </div>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Thời gian tạo</div>
          <div className="text-md text-ink mt-1">
            {formatDateTime(invoice.createdAt)}
          </div>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Vòng đời</div>
          <span
            className={`kv-badge mt-1 ${getLifecycleBadgeClass(invoice.status)}`}
          >
            {getLifecycleLabel(invoice.status)}
          </span>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Thanh toán</div>
          <span className={`kv-badge mt-1 ${getPaymentBadgeClass(invoice)}`}>
            {getPaymentLabel(invoice)}
          </span>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Mã khuyến mãi</div>
          <div className="text-md text-ink mt-1">
            {invoice.promotionCode ?? "Không áp dụng"}
          </div>
        </div>
        <div>
          <div className="text-sm text-ink-muted">Số lượng món</div>
          <div className="text-md text-ink mt-1">{totalQuantity}</div>
        </div>
      </div>

      {(invoice.status !== "ACTIVE" ||
        invoice.splitFromInvoiceId ||
        invoice.mergedIntoInvoiceId ||
        invoice.splitChildInvoiceIds.length > 0 ||
        invoice.mergedSourceInvoiceIds.length > 0) && (
        <div className="mt-4 px-4 py-3 rounded-md bg-primary-25 border border-line text-md">
          <div className="font-semibold text-ink">Liên kết vòng đời</div>
          <ul className="mt-2 flex flex-col gap-1 text-ink-subtle">
            {invoice.status !== "ACTIVE" && (
              <li>
                Hóa đơn này là bản ghi lịch sử và không thể thanh toán trực
                tiếp.
              </li>
            )}
            {invoice.splitFromInvoiceId && (
              <li className="break-all">
                Được tách từ hóa đơn:{" "}
                <span className="text-ink font-medium">
                  {invoice.splitFromInvoiceId}
                </span>
              </li>
            )}
            {invoice.mergedIntoInvoiceId && (
              <li className="break-all">
                Đã chuyển tiếp sang hóa đơn:{" "}
                <span className="text-ink font-medium">
                  {invoice.mergedIntoInvoiceId}
                </span>
              </li>
            )}
            {invoice.splitChildInvoiceIds.length > 0 && (
              <li className="break-all">
                Đã tách thành {invoice.splitChildInvoiceIds.length} hóa đơn con:{" "}
                <span className="text-ink font-medium">
                  {invoice.splitChildInvoiceIds.join(", ")}
                </span>
              </li>
            )}
            {invoice.mergedSourceInvoiceIds.length > 0 && (
              <li className="break-all">
                Được gộp từ {invoice.mergedSourceInvoiceIds.length} hóa đơn
                nguồn:{" "}
                <span className="text-ink font-medium">
                  {invoice.mergedSourceInvoiceIds.join(", ")}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 overflow-x-auto border border-line rounded-md">
        <table className="w-full min-w-[70rem] border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[18rem]`}>Mã món</th>
              <th className={th}>Tên món</th>
              <th className={`${th} text-right w-[10rem]`}>Số lượng</th>
              <th className={`${th} text-right w-[14rem]`}>Đơn giá</th>
              <th className={`${th} text-right w-[15rem]`}>Thành tiền</th>
              <th className={`${th} min-w-[18rem]`}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.menuItemId}-${index}`}>
                <td className={`${td} text-primary`}>{item.menuItemId}</td>
                <td className={td}>{item.menuItemName}</td>
                <td className={`${td} text-right`}>{item.quantity}</td>
                <td className={`${td} text-right`}>{money(item.unitPrice)}</td>
                <td className={`${td} text-right font-medium`}>
                  {money(item.lineTotal)}
                </td>
                <td className={`${td} text-ink-muted`}>{item.note || "—"}</td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr>
                <td
                  className={`${td} text-center text-ink-muted py-6`}
                  colSpan={6}
                >
                  Hóa đơn không có món
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="kv-btn kv-btn-outline-neutral h-10"
            onClick={handlePrint}
          >
            In hóa đơn
          </button>
          <button
            type="button"
            className="kv-btn kv-btn-outline-primary h-10"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {sending ? "Đang gửi..." : "Gửi hóa đơn"}
          </button>
        </div>
        <div className="w-full md:w-[34rem] flex flex-col gap-2 text-md">
          <div className="flex justify-between gap-4">
            <span className="text-ink-subtle">Tạm tính:</span>
            <span className="font-medium text-ink">
              {money(invoice.subtotal)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-subtle">Giảm giá:</span>
            <span className="font-medium text-ink">
              {money(invoice.discountAmount)}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-2 border-t border-line">
            <span className="font-semibold text-ink">Tổng thanh toán:</span>
            <span className="font-bold text-primary">
              {money(invoice.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`mt-4 px-4 py-3 rounded-md text-md ${actionMessage.type === "success" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}
          role={actionMessage.type === "error" ? "alert" : "status"}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-line">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              Lịch sử thanh toán
            </h3>
            <p className="text-sm text-ink-muted mt-1">
              Các giao dịch thuộc hóa đơn này
            </p>
          </div>
          <button
            type="button"
            className="kv-btn kv-btn-outline-neutral h-9"
            onClick={() => void loadPayments()}
            disabled={paymentsLoading}
          >
            Làm mới
          </button>
        </div>

        <div className="overflow-x-auto border border-line rounded-md">
          <table className="w-full min-w-[76rem] border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[18rem]`}>Thời gian</th>
                <th className={`${th} w-[16rem]`}>Phương thức</th>
                <th className={`${th} text-right w-[16rem]`}>Số tiền</th>
                <th className={`${th} w-[13rem]`}>Trạng thái</th>
                <th className={th}>Mã giao dịch</th>
              </tr>
            </thead>
            <tbody>
              {!paymentsLoading &&
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className={td}>{formatDateTime(payment.createdAt)}</td>
                    <td className={td}>
                      {paymentMethodLabels[payment.method]}
                    </td>
                    <td className={`${td} text-right font-medium`}>
                      {money(payment.amount)}
                    </td>
                    <td className={td}>
                      <span
                        className={`kv-badge ${payment.status === "PAID" ? "kv-badge-success" : "kv-badge-neutral"}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className={`${td} text-ink-muted break-all`}>
                      {payment.gatewayRef || "—"}
                    </td>
                  </tr>
                ))}
              {paymentsLoading && (
                <tr>
                  <td
                    className={`${td} text-center text-ink-muted py-6`}
                    colSpan={5}
                  >
                    Đang tải lịch sử thanh toán...
                  </td>
                </tr>
              )}
              {!paymentsLoading && !paymentsError && payments.length === 0 && (
                <tr>
                  <td
                    className={`${td} text-center text-ink-muted py-6`}
                    colSpan={5}
                  >
                    Chưa có lịch sử thanh toán
                  </td>
                </tr>
              )}
              {!paymentsLoading && paymentsError && (
                <tr>
                  <td
                    className={`${td} text-center text-danger bg-danger-50 py-5`}
                    colSpan={5}
                  >
                    {paymentsError}{" "}
                    <button
                      type="button"
                      className="font-semibold hover:underline"
                      onClick={() => void loadPayments()}
                    >
                      Thử lại
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
