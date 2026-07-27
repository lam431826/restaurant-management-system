import { useCallback, useEffect, useRef, useState } from "react";
import type { UserRole } from "../../../context/AuthContext";
import { useRealtime } from "../../../hooks/useRealtime";
import { ApiError } from "../../../services/api";
import {
  applyInvoiceDiscount,
  generateInvoice,
  getInvoiceById,
  getInvoices,
  mergeInvoices,
  sendInvoice,
  splitInvoice,
} from "../../../services/invoiceApi";
import type {
  InvoiceDetail,
  InvoiceSummary,
  MergeInvoiceRequest,
  SplitInvoiceRequest,
} from "../../../services/invoiceApi";
import { updateOrderCustomer } from "../../../services/orderApi";
import type {
  Order,
  OrderCustomerInput,
} from "../../../services/orderApi";
import {
  createVnpayPayment,
  getPayments,
  processCashPayment,
  reconcileVnpayPayment,
} from "../../../services/paymentApi";
import { PaymentModal } from "./PaymentModal";
import { SuccessToast } from "./SuccessToast";
import type { TableItem } from "./types";
import { printCashierInvoice } from "./printInvoice";
import {
  EMPTY_ORDER_MESSAGE,
  INVOICE_DETAIL_LOAD_FALLBACK_ERROR,
  ORDER_ALREADY_INVOICED_MESSAGE,
  ORDER_FINAL_ITEM_LOCK_MESSAGE,
  SAVE_CUSTOMER_FALLBACK_ERROR,
  SEND_INVOICE_FALLBACK_ERROR,
  STALE_INVOICE_ERROR_CODES,
  STALE_MERGE_ERROR_CODES,
  VNPAY_STATUS_MESSAGES,
  getInvoiceGenerationErrorMessage,
  getInvoiceUiErrorMessage,
  getMergeInvoiceErrorMessage,
  getPaymentProcessErrorMessage,
  getPromotionDiscountErrorMessage,
  getSplitInvoiceErrorMessage,
} from "./cashierOrderErrors";
import { chooseInvoiceId } from "./cashierOrderRules";
import {
  selectCheckoutButton,
  selectOrderInvoiceState,
} from "./cashierOrderSelectors";

export interface InvoiceRefreshSnapshot {
  invoices: InvoiceSummary[];
  selectedInvoiceId: string | null;
  activeInvoices: InvoiceSummary[];
  allActiveInvoicesPaid: boolean;
}

interface UseCashierCheckoutOptions {
  orderId: string;
  order: Order | undefined;
  table: TableItem | null;
  role?: UserRole;
  cashierName: string;
  shiftLabel: string;
  onOrderUpdated: (order: Order) => void;
  onWorkspaceRefresh: () => void;
  onOrderError: (message: string | null) => void;
}

export const useCashierCheckout = ({
  orderId,
  order,
  table,
  role,
  cashierName,
  shiftLabel,
  onOrderUpdated,
  onWorkspaceRefresh,
  onOrderError,
}: UseCashierCheckoutOptions) => {
  const [open, setOpen] = useState(false);
  const [successTotal, setSuccessTotal] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invoiceListOrderId, setInvoiceListOrderId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [promotionCode, setPromotionCode] = useState("");
  const [invoiceListLoading, setInvoiceListLoading] = useState(false);
  const [invoiceListError, setInvoiceListError] = useState("");
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [invoiceDetailError, setInvoiceDetailError] = useState("");
  const [invoiceAction, setInvoiceAction] = useState<string | null>(null);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [splitError, setSplitError] = useState("");
  const [mergeError, setMergeError] = useState("");
  const [invoiceMessage, setInvoiceMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [vnpayError, setVnpayError] = useState("");
  const invoiceListRequestRef = useRef(0);
  const invoiceDetailRequestRef = useRef(0);
  const splitSubmissionRef = useRef(false);
  const mergeSubmissionRef = useRef(false);
  const selectedOrderIdRef = useRef(orderId);
  const suppressAutoRefreshForOrderRef = useRef<string | null>(null);

  useEffect(() => {
    selectedOrderIdRef.current = orderId;
    setCustomerError("");
  }, [orderId]);

  useEffect(() => {
    if (successTotal === null) return;
    const timer = window.setTimeout(() => setSuccessTotal(null), 3500);
    return () => window.clearTimeout(timer);
  }, [successTotal]);

  const reset = useCallback(() => {
    invoiceListRequestRef.current += 1;
    invoiceDetailRequestRef.current += 1;
    setInvoices([]);
    setInvoiceListOrderId(null);
    setSelectedInvoiceId(null);
    setSelectedInvoiceDetail(null);
    setPromotionCode("");
    setInvoiceListLoading(false);
    setInvoiceListError("");
    setInvoiceDetailLoading(false);
    setInvoiceDetailError("");
    setInvoiceAction(null);
    setSplitError("");
    setMergeError("");
    splitSubmissionRef.current = false;
    mergeSubmissionRef.current = false;
    setInvoiceMessage(null);
    setOpen(false);
    setPaymentError("");
    setPaymentProcessing(false);
    onOrderError(null);
  }, [onOrderError]);

  const loadInvoiceDetail = useCallback(
    async (invoiceId: string, expectedOrderId: string) => {
      const requestId = ++invoiceDetailRequestRef.current;
      setSelectedInvoiceDetail(null);
      setInvoiceDetailLoading(true);
      setInvoiceDetailError("");
      try {
        const detail = await getInvoiceById(invoiceId);
        if (requestId !== invoiceDetailRequestRef.current) return null;
        if (detail.orderId !== expectedOrderId) {
          setInvoiceDetailError("Hóa đơn không thuộc đơn hàng đang chọn.");
          return null;
        }
        setSelectedInvoiceDetail(detail);
        return detail;
      } catch (error) {
        if (requestId !== invoiceDetailRequestRef.current) return null;
        setInvoiceDetailError(
          getInvoiceUiErrorMessage(error, INVOICE_DETAIL_LOAD_FALLBACK_ERROR),
        );
        return null;
      } finally {
        if (requestId === invoiceDetailRequestRef.current) {
          setInvoiceDetailLoading(false);
        }
      }
    },
    [],
  );

  const refreshInvoices = useCallback(
    async (
      targetOrderId: string,
      preferredInvoiceId: string | null = null,
    ): Promise<InvoiceRefreshSnapshot | null> => {
      const normalizedOrderId = targetOrderId.trim();
      if (!normalizedOrderId) return null;
      const requestId = ++invoiceListRequestRef.current;
      setInvoiceListLoading(true);
      setInvoiceListError("");
      try {
        const foundInvoices = await getInvoices({ orderId: normalizedOrderId });
        if (requestId !== invoiceListRequestRef.current) return null;
        const nextSelectedId = chooseInvoiceId(foundInvoices, preferredInvoiceId);
        setInvoices(foundInvoices);
        setInvoiceListOrderId(normalizedOrderId);
        setSelectedInvoiceId(nextSelectedId);
        setSelectedInvoiceDetail(null);
        setInvoiceDetailError("");
        if (nextSelectedId) {
          await loadInvoiceDetail(nextSelectedId, normalizedOrderId);
        } else {
          invoiceDetailRequestRef.current += 1;
          setInvoiceDetailLoading(false);
        }
        const activeInvoices = foundInvoices.filter(
          (candidate) => candidate.status === "ACTIVE",
        );
        return {
          invoices: foundInvoices,
          selectedInvoiceId: nextSelectedId,
          activeInvoices,
          allActiveInvoicesPaid:
            activeInvoices.length > 0 &&
            activeInvoices.every((candidate) => candidate.paid),
        };
      } catch (error) {
        if (requestId !== invoiceListRequestRef.current) return null;
        setInvoices([]);
        setInvoiceListOrderId(normalizedOrderId);
        setSelectedInvoiceId(null);
        setSelectedInvoiceDetail(null);
        setInvoiceListError(
          getInvoiceUiErrorMessage(error, "Không thể tải danh sách hóa đơn."),
        );
        return null;
      } finally {
        if (requestId === invoiceListRequestRef.current) {
          setInvoiceListLoading(false);
        }
      }
    },
    [loadInvoiceDetail],
  );

  const invoiceListMatchesOrder =
    !!orderId && invoiceListOrderId === orderId;
  const currentOrderInvoices = invoiceListMatchesOrder ? invoices : [];
  const selectedInvoice =
    currentOrderInvoices.find((candidate) => candidate.id === selectedInvoiceId) ??
    null;
  const currentOrderInvoiceDetail =
    selectedInvoice &&
    selectedInvoiceDetail?.id === selectedInvoice.id &&
    selectedInvoiceDetail.orderId === orderId
      ? selectedInvoiceDetail
      : null;
  const invoiceChecked =
    invoiceListMatchesOrder && !invoiceListLoading && !invoiceListError;
  const invoiceState = selectOrderInvoiceState({
    order,
    invoices: currentOrderInvoices,
    invoiceChecked,
  });
  const checkoutButton = selectCheckoutButton({
    invoiceAction,
    invoiceListLoading,
    selectedOrderId: orderId,
    selectedInvoiceId,
    invoiceChecked,
    activeInvoices: invoiceState.activeInvoices,
    orderHasInvoice: invoiceState.orderHasInvoice,
    emptyOrderWithoutInvoice: invoiceState.emptyOrderWithoutInvoice,
  });

  useRealtime(orderId ? `/topic/orders/${orderId}/invoices` : "", () => {
    void refreshInvoices(orderId, selectedInvoiceId);
  });

  useEffect(() => {
    if (
      orderId &&
      suppressAutoRefreshForOrderRef.current === orderId
    ) {
      suppressAutoRefreshForOrderRef.current = null;
      return;
    }
    reset();
    if (orderId && order?.id === orderId) {
      void refreshInvoices(orderId, null);
    }
  }, [orderId, order?.id, refreshInvoices, reset]);

  const generate = async () => {
    const targetOrderId = orderId.trim();
    if (!targetOrderId) {
      setInvoiceMessage({
        type: "error",
        text: "Vui lòng chọn đơn hàng trước khi tạo hóa đơn",
      });
      return;
    }
    if (invoiceState.emptyOrderWithoutInvoice) {
      setOpen(false);
      setInvoiceMessage(null);
      onOrderError(EMPTY_ORDER_MESSAGE);
      return;
    }
    setInvoiceAction("generate");
    setInvoiceMessage(null);
    onOrderError(null);
    try {
      const created = await generateInvoice({
        orderId: targetOrderId,
        promotionCode: null,
      });
      await refreshInvoices(targetOrderId, created.id);
      setOpen(true);
      setInvoiceMessage({
        type: "success",
        text: "Hóa đơn đã được tạo và sẵn sàng thanh toán.",
      });
    } catch (error) {
      const message = getInvoiceGenerationErrorMessage(error);
      setInvoiceMessage({ type: "error", text: message });
      onOrderError(message);
      setOpen(false);
    } finally {
      setInvoiceAction(null);
    }
  };

  const requestOpen = () => {
    onOrderError(null);
    setPaymentError("");
    setSplitError("");
    if (invoiceState.orderHasInvoice) {
      setOpen(true);
    } else {
      void generate();
    }
  };

  const applyDiscount = async () => {
    if (!selectedInvoice || !promotionCode.trim()) return;
    setInvoiceAction("discount");
    setInvoiceMessage(null);
    try {
      await applyInvoiceDiscount(selectedInvoice.id, promotionCode.trim());
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      setPromotionCode("");
      setInvoiceMessage({ type: "success", text: "Áp dụng khuyến mãi thành công" });
    } catch (error) {
      setInvoiceMessage({
        type: "error",
        text: getPromotionDiscountErrorMessage(error),
      });
      if (
        error instanceof ApiError &&
        error.code &&
        STALE_INVOICE_ERROR_CODES.has(error.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      }
    } finally {
      setInvoiceAction(null);
    }
  };

  const send = async () => {
    if (!selectedInvoice) return;
    setInvoiceAction("send");
    setInvoiceMessage(null);
    try {
      const result = await sendInvoice(selectedInvoice.id);
      setInvoiceMessage({ type: "success", text: result.message });
    } catch (error) {
      setInvoiceMessage({
        type: "error",
        text: getInvoiceUiErrorMessage(error, SEND_INVOICE_FALLBACK_ERROR),
      });
    } finally {
      setInvoiceAction(null);
    }
  };

  const saveCustomer = async (customer: OrderCustomerInput) => {
    if (!orderId) return false;
    setCustomerSaving(true);
    setCustomerError("");
    try {
      const updated = await updateOrderCustomer(orderId, customer);
      onOrderUpdated(updated);
      return true;
    } catch (error) {
      setCustomerError(
        getInvoiceUiErrorMessage(error, SAVE_CUSTOMER_FALLBACK_ERROR),
      );
      return false;
    } finally {
      setCustomerSaving(false);
    }
  };

  const print = () => {
    if (!currentOrderInvoiceDetail) return;
    const printed = printCashierInvoice(
      currentOrderInvoiceDetail,
      table?.name || "-",
      cashierName,
      shiftLabel,
      {
        name: order?.customerName ?? null,
        phone: order?.customerPhone ?? null,
        email: order?.customerEmail ?? null,
      },
    );
    if (!printed) {
      setInvoiceMessage({
        type: "error",
        text: "Trình duyệt đã chặn cửa sổ in hóa đơn",
      });
    }
  };

  const confirmCash = async (receivedAmount: number) => {
    if (!selectedInvoice) {
      setPaymentError("Không xác định được hóa đơn cần thanh toán");
      return;
    }
    setPaymentProcessing(true);
    setPaymentError("");
    try {
      const payment = await processCashPayment(selectedInvoice.id, receivedAmount);
      setOpen(false);
      setSuccessTotal(payment.amount);
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
    } catch (error) {
      setPaymentError(getPaymentProcessErrorMessage(error));
      if (
        error instanceof ApiError &&
        error.code &&
        STALE_INVOICE_ERROR_CODES.has(error.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      }
    } finally {
      setPaymentProcessing(false);
    }
  };

  const initiateVnpay = async () => {
    if (!selectedInvoice) {
      setVnpayError("Không xác định được hóa đơn cần thanh toán");
      return;
    }
    setVnpayLoading(true);
    setVnpayError("");
    try {
      const result = await createVnpayPayment(selectedInvoice.id);
      const popup = window.open(result.paymentUrl, "vnpay-payment");
      if (!popup) {
        window.location.href = result.paymentUrl;
        return;
      }
      popup.focus();
    } catch (error) {
      setVnpayError(getPaymentProcessErrorMessage(error));
    } finally {
      setVnpayLoading(false);
    }
  };

  const checkVnpayStatus = async () => {
    if (!selectedInvoice) return;
    setVnpayLoading(true);
    setVnpayError("");
    try {
      const payments = await getPayments(selectedInvoice.id);
      const pending = payments.find(
        (payment) =>
          payment.method === "VNPAY" &&
          payment.status === "PENDING" &&
          Boolean(payment.gatewayRef),
      );
      if (!pending?.gatewayRef) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
        setVnpayError("Không có giao dịch VNPAY nào đang chờ xử lý cho hóa đơn này.");
        return;
      }
      const status = await reconcileVnpayPayment(pending.gatewayRef);
      await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
      if (status.status === "PAID") {
        setPaymentError("");
        setOpen(false);
        setSuccessTotal(status.amount);
        setInvoiceMessage({ type: "success", text: "Thanh toán thành công" });
        return;
      }
      setVnpayError(
        VNPAY_STATUS_MESSAGES[status.status] ??
          "Giao dịch vẫn đang chờ xác nhận từ VNPAY.",
      );
    } catch (error) {
      setVnpayError(getPaymentProcessErrorMessage(error));
    } finally {
      setVnpayLoading(false);
    }
  };

  const selectInvoice = (invoiceId: string) => {
    if (!orderId || invoiceId === selectedInvoiceId) return;
    setSelectedInvoiceId(invoiceId);
    setSelectedInvoiceDetail(null);
    setInvoiceDetailError("");
    setInvoiceMessage(null);
    setPaymentError("");
    setSplitError("");
    setPromotionCode("");
    setVnpayError("");
    void loadInvoiceDetail(invoiceId, orderId);
  };

  const split = async (request: SplitInvoiceRequest): Promise<boolean> => {
    if (
      splitSubmissionRef.current ||
      !selectedInvoice ||
      !currentOrderInvoiceDetail
    ) {
      return false;
    }
    splitSubmissionRef.current = true;
    setInvoiceAction("split");
    setSplitError("");
    setInvoiceMessage(null);
    try {
      const result = await splitInvoice(selectedInvoice.id, request);
      const firstChildId = result.children[0]?.invoiceId;
      if (!firstChildId) {
        setSplitError("Máy chủ không trả về hóa đơn con. Danh sách hóa đơn đã được làm mới.");
        await refreshInvoices(selectedInvoice.orderId, null);
        return false;
      }
      await refreshInvoices(selectedInvoice.orderId, firstChildId);
      setInvoiceMessage({
        type: "success",
        text: "Chia hóa đơn thành công. Hóa đơn con đầu tiên đã được chọn.",
      });
      setOpen(true);
      return true;
    } catch (error) {
      setSplitError(getSplitInvoiceErrorMessage(error));
      if (
        error instanceof ApiError &&
        error.code &&
        STALE_INVOICE_ERROR_CODES.has(error.code)
      ) {
        await refreshInvoices(selectedInvoice.orderId, selectedInvoice.id);
        if (error.code === "ORDER_NOT_FOUND") onWorkspaceRefresh();
      }
      return false;
    } finally {
      splitSubmissionRef.current = false;
      setInvoiceAction(null);
    }
  };

  const merge = async (request: MergeInvoiceRequest): Promise<boolean> => {
    const expectedOrderId = orderId.trim();
    const uniqueInvoiceIds = [...new Set(request.invoiceIds)];
    if (
      mergeSubmissionRef.current ||
      !expectedOrderId ||
      uniqueInvoiceIds.length < 2
    ) {
      return false;
    }
    mergeSubmissionRef.current = true;
    setInvoiceAction("merge");
    setMergeError("");
    setInvoiceMessage(null);
    try {
      const result = await mergeInvoices({ invoiceIds: uniqueInvoiceIds });
      if (selectedOrderIdRef.current !== expectedOrderId) return true;
      const targetInvoiceId = result.targetInvoice?.id?.trim();
      if (result.orderId !== expectedOrderId || !targetInvoiceId) {
        setMergeError("Máy chủ trả về hóa đơn đích không hợp lệ. Danh sách đã được làm mới.");
        await refreshInvoices(expectedOrderId, selectedInvoiceId);
        return false;
      }
      await refreshInvoices(expectedOrderId, targetInvoiceId);
      if (selectedOrderIdRef.current !== expectedOrderId) return true;
      setInvoiceMessage({
        type: "success",
        text: "Gộp hóa đơn thành công. Hóa đơn đích đã được chọn.",
      });
      setOpen(true);
      return true;
    } catch (error) {
      if (selectedOrderIdRef.current !== expectedOrderId) return false;
      setMergeError(getMergeInvoiceErrorMessage(error));
      if (
        error instanceof ApiError &&
        error.code &&
        STALE_MERGE_ERROR_CODES.has(error.code)
      ) {
        await refreshInvoices(expectedOrderId, selectedInvoiceId);
        if (error.code === "ORDER_NOT_FOUND") onWorkspaceRefresh();
      }
      return false;
    } finally {
      mergeSubmissionRef.current = false;
      setInvoiceAction(null);
    }
  };

  const overlays = (
    <>
      {open && orderId && (
        <PaymentModal
          invoices={currentOrderInvoices}
          selectedInvoiceId={selectedInvoiceId}
          invoice={currentOrderInvoiceDetail}
          table={table}
          invoiceListLoading={invoiceListLoading}
          invoiceListError={invoiceListError}
          detailLoading={invoiceDetailLoading}
          detailError={invoiceDetailError}
          processing={paymentProcessing}
          error={paymentError}
          promotionCode={promotionCode}
          action={invoiceAction}
          splitError={splitError}
          mergeError={mergeError}
          role={role}
          invoiceMessage={invoiceMessage}
          nonPayableItems={invoiceState.nonPayableRejectedItems}
          vnpayLoading={vnpayLoading}
          vnpayError={vnpayError}
          cashierName={cashierName}
          shiftLabel={shiftLabel}
          customer={{
            name: order?.customerName ?? null,
            phone: order?.customerPhone ?? null,
            email: order?.customerEmail ?? null,
          }}
          customerSaving={customerSaving}
          customerError={customerError}
          onSaveCustomer={saveCustomer}
          onClose={() => setOpen(false)}
          onSelectInvoice={selectInvoice}
          onRefreshInvoices={() => void refreshInvoices(orderId, selectedInvoiceId)}
          onConfirmCash={(amount) => void confirmCash(amount)}
          onInitiateVnpay={() => void initiateVnpay()}
          onCheckVnpayStatus={() => void checkVnpayStatus()}
          onResetVnpayState={() => setVnpayError("")}
          onPromotionCodeChange={setPromotionCode}
          onApplyDiscount={() => void applyDiscount()}
          onPrint={print}
          onSend={() => void send()}
          onSplit={split}
          onMerge={merge}
          onResetMergeError={() => setMergeError("")}
        />
      )}
      {successTotal !== null && (
        <SuccessToast total={successTotal} onDismiss={() => setSuccessTotal(null)} />
      )}
    </>
  );

  return {
    status: {
      canCloseOrder: invoiceState.canCloseOrder,
      emptyOrderWithoutInvoice: invoiceState.emptyOrderWithoutInvoice,
      itemMutationDisabled:
        invoiceState.orderHasInvoice || invoiceState.orderIsFinal,
      itemMutationDisabledMessage: invoiceState.orderHasInvoice
        ? ORDER_ALREADY_INVOICED_MESSAGE
        : ORDER_FINAL_ITEM_LOCK_MESSAGE,
      checkoutDisabled: checkoutButton.disabled,
      checkoutLabel: checkoutButton.label,
    },
    selectedInvoiceId,
    customerSaving,
    customerError,
    requestOpen,
    reopenPaidInvoice: () => {
      setPaymentError("");
      setVnpayError("");
      setInvoiceMessage(null);
      setOpen(true);
    },
    saveCustomer,
    reset,
    refreshInvoices,
    suppressNextAutoRefresh: (targetOrderId: string) => {
      suppressAutoRefreshForOrderRef.current = targetOrderId;
      return () => {
        if (suppressAutoRefreshForOrderRef.current === targetOrderId) {
          suppressAutoRefreshForOrderRef.current = null;
        }
      };
    },
    setRestoredPaymentOpen: (paymentOpen: boolean) => setOpen(paymentOpen),
    showPaymentSuccess: (amount: number) => setSuccessTotal(amount),
    overlays,
  };
};
