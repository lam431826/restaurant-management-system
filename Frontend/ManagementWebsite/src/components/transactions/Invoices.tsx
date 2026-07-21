import { useCallback, useEffect, useRef, useState } from "react";
import InvoiceFilters from "./InvoiceFilters";
import type { FilterState } from "./InvoiceFilters";
import InvoiceTable from "./InvoiceTable";
import InvoiceToolbar from "./InvoiceToolbar";
import { getInvoices } from "../../services/invoiceApi";
import type { InvoiceStatus, InvoiceSummary } from "../../services/invoiceApi";
import { ApiClientError } from "../../services/apiClient";
import { HISTORY_STATUSES, OPERATIONAL_STATUSES } from "./invoiceLifecycle";
import type { InvoiceViewTab } from "./invoiceLifecycle";

const initialFilters: FilterState = {
  orderId: "",
  paid: "all",
  lifecycle: "all",
};

/**
 * Lifecycle scope is always sent to the backend so the server, not the client, decides
 * which rows belong to the tab. Operational is ACTIVE only; history is SPLIT/MERGED.
 */
const resolveStatusFilter = (
  tab: InvoiceViewTab,
  filters: FilterState,
): InvoiceStatus[] => {
  if (tab === "operational") return OPERATIONAL_STATUSES;
  return filters.lifecycle === "all" ? HISTORY_STATUSES : [filters.lifecycle];
};

const INVOICE_LIST_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
};

const INVOICE_LIST_MESSAGE_FALLBACKS: Record<string, string> = {
  "Invoice not found": INVOICE_LIST_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  "Order not found": INVOICE_LIST_ERROR_MESSAGES.ORDER_NOT_FOUND,
  "Validation failed": INVOICE_LIST_ERROR_MESSAGES.VALIDATION_ERROR,
  "Invalid enum value": INVOICE_LIST_ERROR_MESSAGES.BAD_REQUEST,
  "Malformed or unreadable request body":
    INVOICE_LIST_ERROR_MESSAGES.BAD_REQUEST,
};

const INVOICE_LIST_FALLBACK_ERROR = "Không thể tải danh sách hóa đơn.";

const getInvoiceListErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return INVOICE_LIST_ERROR_MESSAGES[error.code] ?? INVOICE_LIST_FALLBACK_ERROR;
  }

  const message = error instanceof Error ? error.message : "";
  const fallback = Object.entries(INVOICE_LIST_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  );

  return fallback?.[1] ?? INVOICE_LIST_FALLBACK_ERROR;
};

const Invoices = () => {
  const [tab, setTab] = useState<InvoiceViewTab>("operational");
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  // Sticky: once a legacy SPLIT row is confirmed to exist, the "Đã tách" filter stays
  // offered even if the user then narrows to a scope (e.g. "Đã gộp") that no longer
  // includes it. Never reset to false — that would just make the option flicker.
  const [hasSplitHistory, setHasSplitHistory] = useState(false);
  const requestRef = useRef(0);

  const loadInvoices = useCallback(
    async (nextTab: InvoiceViewTab, nextFilters: FilterState) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError("");
      try {
        const result = await getInvoices({
          orderId: nextFilters.orderId || undefined,
          // Payment filtering only applies to operational ACTIVE invoices. A history
          // request must never reinterpret paid=false as an outstanding receivable.
          paid:
            nextTab === "operational" && nextFilters.paid !== "all"
              ? nextFilters.paid === "paid"
              : undefined,
          status: resolveStatusFilter(nextTab, nextFilters),
        });
        // Ignore a response that a newer tab/filter request has already superseded.
        if (requestId !== requestRef.current) return;
        setInvoices(result);
        if (result.some((invoice) => invoice.status === "SPLIT")) {
          setHasSplitHistory(true);
        }
      } catch (loadError) {
        if (requestId !== requestRef.current) return;
        setError(getInvoiceListErrorMessage(loadError));
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadInvoices(tab, filters);
  }, [tab, filters, loadInvoices]);

  const refreshInvoices = async () => {
    await loadInvoices(tab, filters);
    setRefreshVersion((version) => version + 1);
  };

  const changeTab = (nextTab: InvoiceViewTab) => {
    if (nextTab === tab) return;
    // Reset filters that do not apply to the target tab, keep the order-id search.
    setFilters((current) => ({
      orderId: current.orderId,
      paid: "all",
      lifecycle: "all",
    }));
    setTab(nextTab);
  };

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-5 pb-4 overflow-y-auto border-r border-line bg-card">
        <InvoiceFilters
          initialState={initialFilters}
          tab={tab}
          onApply={setFilters}
          hasSplitHistory={hasSplitHistory}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4">
        <InvoiceToolbar
          invoices={invoices}
          loading={loading}
          tab={tab}
          onRefresh={() => void refreshInvoices()}
        />

        <div
          className="flex items-center gap-1 border-b border-line"
          role="tablist"
          aria-label="Chế độ xem hóa đơn"
        >
          {(
            [
              ["operational", "Đang hiệu lực"],
              ["history", "Lịch sử vòng đời"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => changeTab(value)}
              className={`h-10 px-4 text-md font-semibold border-b-2 -mb-px transition-colors ${
                tab === value
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-subtle hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-danger-50 text-danger-700 text-md"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => void refreshInvoices()}
            >
              Thử lại
            </button>
          </div>
        )}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          tab={tab}
          refreshVersion={refreshVersion}
        />
      </section>
    </div>
  );
};

export default Invoices;
