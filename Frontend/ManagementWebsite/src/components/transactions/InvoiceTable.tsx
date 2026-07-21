import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import InvoiceDetail from "./InvoiceDetail";
import { getInvoiceById } from "../../services/invoiceApi";
import type {
  InvoiceDetail as InvoiceDetailData,
  InvoiceSummary,
} from "../../services/invoiceApi";
import { ApiClientError } from "../../services/apiClient";
import {
  getLifecycleBadgeClass,
  getLifecycleLabel,
  getLineageHint,
  getPaymentBadgeClass,
  getPaymentLabel,
  isActiveInvoice,
} from "./invoiceLifecycle";
import type { InvoiceViewTab } from "./invoiceLifecycle";

interface Props {
  invoices: InvoiceSummary[];
  loading: boolean;
  tab: InvoiceViewTab;
  refreshVersion: number;
  deepLinkInvoiceId?: string | null;
}

const money = (value: number) => value.toLocaleString("vi-VN");
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const th =
  "sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap";
const td = "text-md text-ink px-3 py-3 border-b border-line align-middle";

const INVOICE_DETAIL_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const INVOICE_DETAIL_MESSAGE_FALLBACKS: Record<string, string> = {
  "Invoice not found": INVOICE_DETAIL_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": INVOICE_DETAIL_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Validation failed": INVOICE_DETAIL_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": INVOICE_DETAIL_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    INVOICE_DETAIL_ERROR_MESSAGES.BAD_REQUEST,
};

const INVOICE_DETAIL_FALLBACK_ERROR = "Không thể tải chi tiết hóa đơn.";

const getInvoiceDetailErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      INVOICE_DETAIL_ERROR_MESSAGES[error.code] ??
      INVOICE_DETAIL_FALLBACK_ERROR
    );
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(INVOICE_DETAIL_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? INVOICE_DETAIL_FALLBACK_ERROR;
};

const InvoiceTable = ({
  invoices,
  loading,
  tab,
  refreshVersion,
  deepLinkInvoiceId,
}: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const previousRefreshVersion = useRef(refreshVersion);
  const consumedDeepLinkRef = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const loadDetail = useCallback(async (invoiceId: string) => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setDetail(await getInvoiceById(invoiceId));
    } catch (loadError) {
      setDetailError(getInvoiceDetailErrorMessage(loadError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (previousRefreshVersion.current === refreshVersion) return;
    previousRefreshVersion.current = refreshVersion;
    if (expandedId) void loadDetail(expandedId);
  }, [expandedId, loadDetail, refreshVersion]);

  // Jump straight to a specific invoice (e.g. from a Sổ quỹ auto-generated receipt voucher).
  // Only fires once per deep-link id, and only once that invoice actually shows up in the
  // currently loaded/filtered list — a later lifecycle change (split/merged) that moves it
  // out of the default "operational" tab is a rare edge case we don't special-case here.
  useEffect(() => {
    if (!deepLinkInvoiceId || loading) return;
    if (consumedDeepLinkRef.current === deepLinkInvoiceId) return;
    const match = invoices.find((invoice) => invoice.id === deepLinkInvoiceId);
    if (!match) return;
    consumedDeepLinkRef.current = deepLinkInvoiceId;
    setExpandedId(match.id);
    void loadDetail(match.id);
    rowRefs.current[match.id]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [deepLinkInvoiceId, invoices, loading, loadDetail]);

  const toggleDetail = async (invoice: InvoiceSummary) => {
    if (expandedId === invoice.id) {
      setExpandedId(null);
      setDetail(null);
      setDetailError("");
      return;
    }

    setExpandedId(invoice.id);
    await loadDetail(invoice.id);
  };

  // Financial totals are derived from ACTIVE invoices only. SPLIT/MERGED sources are
  // superseded records whose value already lives in their ACTIVE descendants, so
  // including them would double count. The backend already scopes the tab; this filter
  // keeps the invariant local and explicit.
  const activeInvoices = invoices.filter(isActiveInvoice);
  const totals = activeInvoices.reduce(
    (sum, invoice) => ({
      subtotal: sum.subtotal + invoice.subtotal,
      discount: sum.discount + invoice.discountAmount,
      total: sum.total + invoice.totalAmount,
    }),
    { subtotal: 0, discount: 0, total: 0 },
  );

  // Counted strictly by lifecycle status so the numbers always describe exactly the rows
  // this tab is showing. An ACTIVE invoice carrying splitFromInvoiceId is a split *child*:
  // it is still payable, lives in the operational tab, and must never be counted here —
  // otherwise the counter would claim history records the table cannot show.
  const splitCount = invoices.filter(
    (invoice) => invoice.status === "SPLIT",
  ).length;
  const mergedCount = invoices.filter(
    (invoice) => invoice.status === "MERGED",
  ).length;
  const isHistory = tab === "history";

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-hidden">
      {!loading && invoices.length > 0 && !isHistory && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 px-4 py-3 bg-primary-25 border-b border-line shrink-0">
          <div>
            <div className="text-sm text-ink-muted">Hóa đơn đang hiệu lực</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {activeInvoices.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-ink-muted">Tổng tạm tính</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {money(totals.subtotal)}
            </div>
          </div>
          <div>
            <div className="text-sm text-ink-muted">Tổng giảm giá</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {money(totals.discount)}
            </div>
          </div>
          <div>
            {/* Invoice face value, not collected revenue. Collected revenue must come
                from successful Payment records, which this screen does not read. */}
            <div className="text-sm text-ink-muted">Tổng giá trị hóa đơn</div>
            <div className="text-lg font-bold text-primary mt-0.5">
              {money(totals.total)}
            </div>
          </div>
        </div>
      )}

      {/* Rendered even when the history dataset is empty, so the counters always describe
          the rows on screen. Hiding the block at zero made an empty history view look
          broken rather than simply empty.
          "Đã tách" only appears when a legacy SPLIT row actually exists — with the
          partial-quantity split contract, new splits never produce one, so showing an
          always-present "Đã tách: 0" card would look like a normal, currently-empty
          history category rather than "this category doesn't apply anymore". */}
      {!loading && isHistory && (
        <div
          className={`grid ${splitCount > 0 ? "grid-cols-3" : "grid-cols-2"} gap-x-6 gap-y-3 px-4 py-3 bg-primary-25 border-b border-line shrink-0`}
        >
          <div>
            <div className="text-sm text-ink-muted">Bản ghi lịch sử</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {invoices.length}
            </div>
          </div>
          {splitCount > 0 && (
            <div>
              <div className="text-sm text-ink-muted">Đã tách</div>
              <div className="text-lg font-semibold text-ink mt-0.5">
                {splitCount}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm text-ink-muted">Đã gộp</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {mergedCount}
            </div>
          </div>
          <div
            className={`${splitCount > 0 ? "col-span-3" : "col-span-2"} text-sm text-ink-muted`}
          >
            Hóa đơn lịch sử đã được chuyển tiếp sang hóa đơn khác. Giá trị của
            chúng không được cộng vào doanh thu hay công nợ. Hóa đơn tách theo số
            lượng vẫn còn thanh toán được nên nằm ở tab "Đang hiệu lực", không
            tính vào đây.
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[80rem] border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[16rem]`}>Mã hóa đơn</th>
              <th className={`${th} w-[15rem]`}>Mã đơn hàng</th>
              <th className={`${th} w-[17rem]`}>Thời gian tạo</th>
              <th className={`${th} text-right w-[14rem]`}>Tạm tính</th>
              <th className={`${th} text-right w-[13rem]`}>Giảm giá</th>
              <th className={`${th} text-right w-[15rem]`}>Tổng thanh toán</th>
              <th className={`${th} w-[17rem]`}>Vòng đời</th>
              <th className={`${th} w-[15rem]`}>Thanh toán</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              invoices.map((invoice) => {
                const isOpen = expandedId === invoice.id;
                return (
                  <Fragment key={invoice.id}>
                    <tr
                      ref={(el) => { rowRefs.current[invoice.id] = el; }}
                      className={`cursor-pointer ${isOpen ? "bg-primary-50" : "hover:bg-primary-25"}`}
                      onClick={() => void toggleDetail(invoice)}
                    >
                      <td
                        className={`${td} font-medium font-mono whitespace-nowrap ${isOpen ? "text-primary" : ""}`}
                        title={invoice.id}
                      >
                        {invoice.code}
                      </td>
                      <td
                        className={`${td} font-mono whitespace-nowrap text-ink-subtle`}
                        title={invoice.orderId}
                      >
                        {invoice.orderCode}
                      </td>
                      <td className={td}>
                        {formatDateTime(invoice.createdAt)}
                      </td>
                      <td className={`${td} text-right`}>
                        {money(invoice.subtotal)}
                      </td>
                      <td className={`${td} text-right`}>
                        {money(invoice.discountAmount)}
                      </td>
                      <td className={`${td} text-right font-semibold`}>
                        {money(invoice.totalAmount)}
                      </td>
                      <td className={td}>
                        <span
                          className={`kv-badge ${getLifecycleBadgeClass(invoice.status)}`}
                        >
                          {getLifecycleLabel(invoice.status)}
                        </span>
                        {getLineageHint(invoice) && (
                          <div className="text-sm text-ink-muted mt-1 break-all">
                            {getLineageHint(invoice)}
                          </div>
                        )}
                      </td>
                      <td className={td}>
                        <span
                          className={`kv-badge ${getPaymentBadgeClass(invoice)}`}
                        >
                          {getPaymentLabel(invoice)}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          {detailLoading && (
                            <div className="px-5 py-8 text-center text-md text-ink-muted">
                              Đang tải chi tiết hóa đơn...
                            </div>
                          )}
                          {detailError && (
                            <div className="px-5 py-5 text-md text-danger bg-danger-50">
                              {detailError}
                            </div>
                          )}
                          {detail && (
                            <InvoiceDetail
                              invoice={detail}
                              historyRefreshVersion={refreshVersion}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

            {loading && (
              <tr>
                <td
                  className={`${td} text-center text-ink-muted py-16`}
                  colSpan={8}
                >
                  Đang tải danh sách hóa đơn...
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td
                  className={`${td} text-center text-ink-muted py-16`}
                  colSpan={8}
                >
                  {isHistory
                    ? "Chưa có hóa đơn lịch sử nào. Hóa đơn tách theo số lượng vẫn đang hiệu lực và hiển thị ở tab \"Đang hiệu lực\"."
                    : "Không tìm thấy hóa đơn nào"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
