import { useCallback, useEffect, useState } from "react";
import ApplyDiscountModal from "./ApplyDiscountModal";
import GenerateInvoiceModal from "./GenerateInvoiceModal";
import InvoiceFilters from "./InvoiceFilters";
import type { FilterState } from "./InvoiceFilters";
import InvoiceTable from "./InvoiceTable";
import InvoiceToolbar from "./InvoiceToolbar";
import ProcessPaymentModal from "./ProcessPaymentModal";
import {
  applyInvoiceDiscount,
  generateInvoice,
  getInvoices,
} from "../../services/invoiceApi";
import type { InvoiceSummary } from "../../services/invoiceApi";
import { processPayment } from "../../services/paymentApi";
import type { PaymentMethod } from "../../services/paymentApi";
import { ApiClientError } from "../../services/apiClient";

const initialFilters: FilterState = {
  orderId: "",
  paid: "all",
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
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [discountInvoice, setDiscountInvoice] = useState<InvoiceSummary | null>(
    null,
  );
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceSummary | null>(
    null,
  );
  const [refreshVersion, setRefreshVersion] = useState(0);

  const loadInvoices = useCallback(async (nextFilters: FilterState) => {
    setLoading(true);
    setError("");
    try {
      setInvoices(
        await getInvoices({
          orderId: nextFilters.orderId || undefined,
          paid:
            nextFilters.paid === "all"
              ? undefined
              : nextFilters.paid === "paid",
        }),
      );
    } catch (loadError) {
      setError(getInvoiceListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices(filters);
  }, [filters, loadInvoices]);

  const refreshInvoices = async () => {
    await loadInvoices(filters);
    setRefreshVersion((version) => version + 1);
  };

  const handleGenerate = async (
    orderId: string,
    promotionCode: string | null,
  ) => {
    const created = await generateInvoice({ orderId, promotionCode });
    setShowGenerate(false);
    setSuccess(`Tạo hóa đơn ${created.id} thành công`);
    await refreshInvoices();
  };

  const handleApplyDiscount = async (promotionCode: string) => {
    if (!discountInvoice) return;
    await applyInvoiceDiscount(discountInvoice.id, promotionCode);
    setDiscountInvoice(null);
    setSuccess(
      `Áp dụng khuyến mãi cho hóa đơn ${discountInvoice.id} thành công`,
    );
    await refreshInvoices();
  };

  const handleProcessPayment = async (method: PaymentMethod) => {
    if (!paymentInvoice) return;
    const invoiceId = paymentInvoice.id;
    await processPayment(invoiceId, method);
    setPaymentInvoice(null);
    setSuccess(`Thanh toán hóa đơn ${invoiceId} thành công`);
    await refreshInvoices();
  };

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-5 pb-4 overflow-y-auto border-r border-line bg-card">
        <InvoiceFilters initialState={initialFilters} onApply={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4">
        <InvoiceToolbar
          invoices={invoices}
          loading={loading}
          onGenerate={() => {
            setShowGenerate(true);
            setSuccess("");
          }}
          onRefresh={() => void refreshInvoices()}
        />

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
        {success && (
          <div
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-success-50 text-success-700 text-md"
            role="status"
          >
            <span>{success}</span>
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => setSuccess("")}
            >
              Đóng
            </button>
          </div>
        )}

        <InvoiceTable
          invoices={invoices}
          loading={loading}
          refreshVersion={refreshVersion}
          onApplyDiscount={(invoice) => {
            setDiscountInvoice(invoice);
            setSuccess("");
          }}
          onProcessPayment={(invoice) => {
            setPaymentInvoice(invoice);
            setSuccess("");
          }}
        />
      </section>

      {showGenerate && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerate(false)}
          onSubmit={handleGenerate}
        />
      )}
      {discountInvoice && (
        <ApplyDiscountModal
          invoice={discountInvoice}
          onClose={() => setDiscountInvoice(null)}
          onSubmit={handleApplyDiscount}
        />
      )}
      {paymentInvoice && (
        <ProcessPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={handleProcessPayment}
        />
      )}
    </div>
  );
};

export default Invoices;
