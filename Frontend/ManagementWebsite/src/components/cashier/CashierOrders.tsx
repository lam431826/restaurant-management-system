import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRealtime } from "../../hooks/useRealtime";
import { useAuth } from "../../context/useAuth";
import {
  listTables,
  checkInWalkIn,
  undoWalkInCheckIn,
} from "../../services/tableService";
import {
  checkInReservation,
  cancelStaffReservation,
} from "../../services/reservationApi";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import { listCategories, searchItems } from "../../services/menuService";
import type { MenuCategory } from "../../services/menuService";
import {
  addOrderItems,
  cancelOrder,
  createOrder,
  closeOrder,
  getOrder,
  listOrders,
  listPendingAssistance,
  acceptOrder,
  purgeOrderItem,
  removeOrderItem,
  respondAssistance,
  updateOrderItemStatus,
  updateOrderItemNote,
} from "../../services/orderApi";
import type { AssistanceRequest, Order } from "../../services/orderApi";

import type {
  MenuItem,
  TableItem,
  OrderItem,
  CartItem,
} from "./orders/types";
import {
  toTableItem,
  ACTIVE_ORDER_STATUSES,
  OCCUPIED_STATUSES,
  COOKING_STATUS_LABEL,
  COOKING_STATUS_FROM_LABEL,
  ROLE_LABEL,
} from "./orders/types";
import { Header } from "./orders/Header";
import { MenuView } from "./orders/MenuView";
import { TableView } from "./orders/TableView";
import { ReservationPanel } from "./orders/ReservationPanel";
import { AddNoteModal } from "./orders/AddNoteModal";
import { OrderPanel } from "./orders/OrderPanel";
import { PaymentResultToast } from "./orders/SuccessToast";
import { SearchIcon } from "./orders/icons";
import { QROrderConfirmationModal } from "./orders/QROrderConfirmationModal";
import { ConfirmActionModal } from "./orders/ConfirmActionModal";
import { useCashierShiftSession } from "./orders/useCashierShiftSession";
import { useCashierCheckout } from "./orders/useCashierCheckout";
import {
  selectFilteredMenu,
  selectMenuCategoryPills,
  selectTableCounts,
} from "./orders/cashierOrderSelectors";
import { Skeleton } from "../dashboard/DashboardStates";

/* ─── Main page ──────────────────────────────────────────────────────────── */
import {
  EMPTY_ORDER_MESSAGE,
  getOrderActionErrorMessage,
} from "./orders/cashierOrderErrors";
import {
  TABLE_FILTERS,
  WALK_IN_MIN_GAP_MINUTES,
  applyActiveOrdersToTable,
  clearStoredVnpayReturnContext,
  readStoredVnpayReturnContext,
} from "./orders/cashierOrderRules";
import type { VnpayReturnContext } from "./orders/cashierOrderRules";


const CashierOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const shiftSession = useCashierShiftSession();
  const { shift, loading: shiftLoading } = shiftSession;
  const [tab, setTab] = useState<"menu" | "table">("menu");
  const [activeArea, setActiveArea] = useState<string>("all");
  const [tableFilter, setFilter] = useState("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [activeMenuCategory, setActiveMenuCategory] = useState("all");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [assistanceRequests, setAssistanceRequests] = useState<
    AssistanceRequest[]
  >([]);
  const [search, setSearch] = useState("");
  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    itemId: string | null;
    text: string;
  }>({ open: false, itemId: null, text: "" });
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    orderId: string | null;
    itemId: string | null;
    text: string;
  }>({ open: false, orderId: null, itemId: null, text: "" });
  const [removeConfirmModal, setRemoveConfirmModal] = useState<{
    open: boolean;
    orderId: string | null;
    orderItemId: string | null;
  }>({ open: false, orderId: null, orderItemId: null });
  const [cancelConfirmModal, setCancelConfirmModal] = useState<{
    open: boolean;
    orderIds: string[];
  }>({ open: false, orderIds: [] });
  const [reservationCancelConfirmOpen, setReservationCancelConfirmOpen] =
    useState(false);
  // VNPAY success now reuses successTotal/SuccessToast below, so this only ever holds a
  // failure message — see restoreFromVnpayState.
  const [vnpayFailureNotice, setVnpayFailureNotice] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [showChangePw, setShowChangePw] = useState(false);
  // Draft contact for the order panel. Before an order exists this is the only copy and
  // is sent with createOrder; once the order exists it mirrors the saved Order record.
  const [customerDraft, setCustomerDraft] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });
  const loadCashierStateRequestRef = useRef(0);
  const createOrderSubmissionRef = useRef(false);
  const selectedTableIdRef = useRef("");
  const vnpayReturnHandledRef = useRef<string | null>(null);
  const [createOrderSubmitting, setCreateOrderSubmitting] = useState(false);
  const [checkInWalkInSubmitting, setCheckInWalkInSubmitting] = useState(false);
  const [undoCheckInSubmitting, setUndoCheckInSubmitting] = useState(false);
  const [orderActionMessage, setOrderActionMessage] = useState<{
    type: "error";
    text: string;
  } | null>(null);

  // ── Reservation panel state ───────────────────────────────────────────────
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  // A table with an upcomingReservation still shows the reservation panel by default (check-in
  // for that guest). If the reservation is far enough out (see WALK_IN_MIN_GAP_MINUTES, mirrors
  // OrderServiceImpl.create()'s server-side rule), staff can opt into seating a walk-in instead —
  // tracked per table id so switching tables resets it back to the reservation view.
  const [walkInOverrideTableId, setWalkInOverrideTableId] = useState<string | null>(null);

  const [showQRModal, setShowQRModal] = useState(false);

  // Returns the freshly fetched snapshot (in addition to its usual setState calls) so a
  // caller that needs correctly order-linked table data *immediately* — e.g. VNPAY
  // restoration — doesn't have to read back potentially stale/batched React state or wait
  // for the [activeOrders] overlay effect's own follow-up render to converge. The returned
  // tables already have orderId/amount/items resolved via applyActiveOrdersToTable, unlike
  // this function's own setTables call below, which deliberately preserves the *previous*
  // orderId (see the comment on that call) since the overlay effect is what's authoritative
  // for that field once the state settles.
  const loadCashierState = useCallback(async (): Promise<{
    tables: TableItem[];
    activeOrders: Order[];
  } | null> => {
    const requestId = ++loadCashierStateRequestRef.current;
    const [tableRows, orderPage] = await Promise.all([
      listTables(),
      listOrders(0, 100),
    ]);
    const mappedTables = tableRows
      .filter((table) => table.active)
      .sort((a, b) => a.order - b.order)
      .map(toTableItem);
    const orderById = new Map(orderPage.data.map((order) => [order.id, order]));
    const missingActiveOrderIds = Array.from(
      new Set(
        mappedTables
          .map((table) => table.orderId)
          .filter(
            (orderId): orderId is string =>
              Boolean(orderId) && !orderById.has(orderId as string),
          ),
      ),
    );
    const missingOrders = await Promise.allSettled(
      missingActiveOrderIds.map((orderId) => getOrder(orderId)),
    );
    missingOrders.forEach((result) => {
      if (
        result.status === "fulfilled" &&
        ACTIVE_ORDER_STATUSES.includes(result.value.status)
      ) {
        orderById.set(result.value.id, result.value);
      }
    });

    // Bug fix: a newer refresh (e.g. the WS-triggered one right after handleCreateOrder's own
    // POST resolves) can start and finish before this one, if this fetch's listOrders() read
    // landed on the DB mid-transaction — OrderServiceImpl.create() broadcasts to /topic/orders
    // synchronously, inside its own @Transactional method, before commit. Applying this response
    // after a newer one has already landed would silently wipe out the just-created order from
    // activeOrders (and, via the table-overlay effect below, null out the table's orderId right
    // after handleCreateOrder set it), making "Thêm món vào Đơn" disappear and revert to
    // "Tạo Order" even though the order exists server-side.
    if (requestId !== loadCashierStateRequestRef.current) return null;

    const freshActiveOrders = Array.from(orderById.values());
    setActiveOrders(freshActiveOrders);
    setTables((currentTables) => {
      const selectedId = currentTables.find((table) => table.selected)?.id;
      return mappedTables.map((table) => {
        const old = currentTables.find((p) => p.id === table.id);
        const status = old?.status === "BILLING" ? "BILLING" : table.status;
        return {
          ...table,
          selected: table.id === selectedId,
          // See the matching fix in refreshTables() — derive occupied from fresh status instead
          // of blindly preserving the old value.
          occupied: OCCUPIED_STATUSES.includes(status) || Boolean(old?.orderId),
          amount: old?.amount ?? 0,
          items: old?.items ?? 0,
          orderId: old?.orderId ?? null,
          status,
        };
      });
    });
    setActiveArea((currentArea) => {
      if (
        currentArea === "all" ||
        mappedTables.some((table) => table.area === currentArea)
      ) {
        return currentArea;
      }
      return mappedTables[0]?.area ?? "all";
    });

    return {
      tables: mappedTables.map((table) =>
        applyActiveOrdersToTable(table, freshActiveOrders),
      ),
      activeOrders: freshActiveOrders,
    };
  }, []);

  // Re-fetches table list from backend and merges selection state.
  // Called after reservation actions and order close/cancel so statuses
  // (RESERVED→OCCUPIED, OCCUPIED→AVAILABLE, etc.) reflect backend truth.
  const refreshTables = () => {
    return listTables()
      .then((res) => {
        const updated = res
          .filter((t) => t.active)
          .sort((a, b) => a.order - b.order)
          .map(toTableItem);
        setTables((prev) =>
          updated.map((t) => {
            const old = prev.find((p) => p.id === t.id);
            const status = old?.status === "BILLING" ? "BILLING" : t.status;
            return {
              ...t,
              selected: old?.selected ?? false,
              // Bug fix: this used to always preserve the OLD occupied value instead of
              // deriving it from the just-fetched status — combined with the activeOrders
              // overlay effect's own occupied-when-no-order bug (also fixed), a table checked
              // in with no order yet stayed permanently "not occupied" in the UI (ReservationPanel
              // kept offering a "Check-In khách" that always failed with
              // INVALID_STATUS_TRANSITION) until something unrelated nudged activeOrders.
              // Trust status — now genuinely OCCUPIED/BILLING without requiring an order (see
              // Check-in khách / reservation check-in) — amount/items/orderId still come from
              // the activeOrders overlay below to avoid the polling jitter this preservation
              // pattern was originally added for.
              occupied: OCCUPIED_STATUSES.includes(status) || Boolean(old?.orderId),
              amount: old?.amount ?? 0,
              items: old?.items ?? 0,
              orderId: old?.orderId ?? null,
              status,
            };
          }),
        );
      })
      .catch(() => {});
  };

  const loadMenu = () => {
    Promise.all([listCategories(), searchItems({ available: true, size: 200 })])
      .then(([cats, page]) => {
        setMenuCategories(cats);
        setMenuItems(page.data.map((item) => ({ ...item, qty: 0 })));
      })
      .catch(() => {
        /* silently keep empty */
      });
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // "Call waiter" assistance requests raised by guests, polled for the bell dropdown.
  useEffect(() => {
    const fetchAssistance = async () => {
      try {
        setAssistanceRequests(await listPendingAssistance());
      } catch (err) {
        console.error(err);
      }
    };
    void fetchAssistance();
  }, []);

  // Real-time push races the poll above — an assistance request created/resolved
  // anywhere shows up near-instantly; the poll stays as a backstop if the WS drops.
  useRealtime("/topic/assistance", () => {
    listPendingAssistance()
      .then(setAssistanceRequests)
      .catch(() => {});
  });

  // Live orders and authoritative table ownership are polled together, kept in sync
  // with the kitchen; real-time push (below) is the primary path and this poll is a backstop.
  useEffect(() => {
    const refresh = async () => {
      try {
        await loadCashierState();
      } catch (err) {
        console.error(err);
      } finally {
        setTablesLoading(false);
      }
    };
    void refresh();
  }, [loadCashierState, refreshTrigger]);

  // Order/item status changes pushed over WS bump refreshTrigger, reusing the same
  // refetch path the mutation handlers below already use — one source of truth.
  useRealtime("/topic/orders", () => {
    setRefreshTrigger((t) => t + 1);
  });

  // Table status changes (from any terminal, including the BR-04 no-show cron) — refetch
  // the floor view immediately instead of waiting on refreshTables() to be called manually.
  useRealtime("/topic/tables", () => {
    refreshTables();
  });

  // Reservation edits (guest info, party size, time, table assignment/transfer, status
  // changes) from the waiter/manager reservation screen — the table grid's upcomingReservation
  // panel comes from listTables(), so any reservation change also needs a table refetch even
  // when it doesn't itself flip a table's status (e.g. editing guest name on an already-RESERVED table).
  useRealtime("/topic/reservations", () => {
    refreshTables();
  });

  // Overlay live order totals onto the table grid (amount/guests/item count, orderId link).
  // Status is NOT overridden here — backend-provided statuses (RESERVED, CLEANING, etc.)
  // are preserved.
  useEffect(() => {
    setTables((prevTables) =>
      prevTables.map((t) => applyActiveOrdersToTable(t, activeOrders)),
    );
  }, [activeOrders]);

  useEffect(() => {
    if (vnpayFailureNotice !== null) {
      const t = setTimeout(() => setVnpayFailureNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [vnpayFailureNotice]);

  const selectedTable = tables.find((table) => table.selected) ?? null;
  const selectedOrderId = selectedTable?.orderId ?? "";
  const selectedOrder = activeOrders.find(
    (order) => order.id === selectedOrderId,
  );
  const cashierDisplayName =
    user?.fullName?.trim() || user?.username?.trim() || "Thu ngân";
  const shiftDisplayLabel = (() => {
    if (!shift) return "Chưa mở ca";
    const openedAt = new Date(shift.openedAt);
    const time = (value: Date) =>
      value.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    return shift.closedAt
      ? `${time(openedAt)} - ${time(new Date(shift.closedAt))}`
      : `Đang mở từ ${time(openedAt)}`;
  })();
  const handleCheckoutOrderUpdated = useCallback((updated: Order) => {
    setActiveOrders((orders) =>
      orders.map((order) => (order.id === updated.id ? updated : order)),
    );
  }, []);
  const handleCheckoutWorkspaceRefresh = useCallback(() => {
    setRefreshTrigger((value) => value + 1);
  }, []);
  const handleCheckoutOrderError = useCallback((message: string | null) => {
    setOrderActionMessage(message ? { type: "error", text: message } : null);
  }, []);
  const checkout = useCashierCheckout({
    orderId: selectedOrderId,
    order: selectedOrder,
    table: selectedTable,
    role: user?.role,
    cashierName: cashierDisplayName,
    shiftLabel: shiftDisplayLabel,
    onOrderUpdated: handleCheckoutOrderUpdated,
    onWorkspaceRefresh: handleCheckoutWorkspaceRefresh,
    onOrderError: handleCheckoutOrderError,
  });

  // Restores the cashier's table/order/payment context after a VNPAY round-trip — either a
  // same-tab redirect (router state, or its localStorage fallback), or the cross-tab case
  // where a separate VNPAY tab created by the checkout module wrote this context and closed
  // itself, picked up by the focus listener further below. Payment status always comes from
  // the fresh invoice/order data reloaded here, never from the stored context itself — the
  // context only selects which table/order/invoice to reload and display.
  const restoreFromVnpayState = useCallback(
    async (state: VnpayReturnContext | null) => {
      if (!state?.txnRef || !state.orderId) return;
      // Guards against reprocessing the same VNPAY return more than once on this component
      // instance (React StrictMode's double-invoke, a duplicate focus event, etc.); a
      // genuinely new return always carries a different txnRef. A fresh mount (e.g. a page
      // refresh while restoration keeps failing) gets a fresh ref and will retry, as long as
      // the stored context hasn't been cleared.
      if (vnpayReturnHandledRef.current === state.txnRef) return;
      vnpayReturnHandledRef.current = state.txnRef;

      // Both outcomes reuse the same PaymentResultToast card the cash flow shows
      // from the checkout module instead of VNPAY having its own look —
      // success and failure used to read as two different kinds of message (a bordered card
      // with an icon vs. a plain solid-color pill) even though both are just "here's what
      // happened to the payment."
      if (state.paymentResult === "PAID") {
        checkout.showPaymentSuccess(state.amount ?? 0);
      } else {
        const message =
          state.paymentResult === "FAILED"
            ? "Thanh toán VNPAY thất bại."
            : state.paymentResult === "CANCELLED"
              ? "Giao dịch VNPAY đã bị hủy."
              : state.paymentResult === "EXPIRED"
                ? "Giao dịch VNPAY đã hết hạn."
                : undefined;
        if (message) setVnpayFailureNotice(message);
      }

      const { tableId, orderId, invoiceId, paymentResult } = state;
      let restored = false;
      let releaseAutoRefreshSuppression: (() => void) | null = null;
      try {
        // loadCashierState() returns the freshly fetched, fully order-linked snapshot
        // directly — restoration reads that returned value, not React state, so it can't
        // be tripped up by batching/timing of the setState calls loadCashierState also
        // makes. A single retry covers the (normally unreachable, since this is always the
        // last-issued call right after mount) case where its own requestId race guard
        // discarded the first attempt because something else refreshed concurrently.
        let snapshot = await loadCashierState();
        if (!snapshot) {
          snapshot = await loadCashierState();
        }
        if (!snapshot) {
          throw new Error("Không thể tải dữ liệu bàn/đơn hàng mới nhất.");
        }

        let table = tableId
          ? (snapshot.tables.find((t) => t.id === tableId) ?? null)
          : null;
        if (!table) {
          const order =
            snapshot.activeOrders.find((o) => o.id === orderId) ?? null;
          if (order) {
            table = snapshot.tables.find((t) => t.id === order.tableId) ?? null;
          }
        }
        if (!table) {
          setVnpayFailureNotice(
            "Không tìm thấy bàn hoặc đơn hàng để khôi phục. Vui lòng thử lại.",
          );
          return;
        }

        // Select the exact table with its already-resolved orderId/amount/items — no need
        // to wait for the separate [activeOrders] overlay effect to converge on a later
        // render, which is what left the screen looking unrestored before. This also
        // changes selectedOrderId, which the checkout module reacts to with its own
        // null-invoice-preference refresh; suppress it once for this
        // order so it doesn't clobber the specific invoiceId refreshed explicitly below.
        const resolvedTable = table;
        releaseAutoRefreshSuppression = checkout.suppressNextAutoRefresh(orderId);
        setTables((ts) =>
          ts.map((t) =>
            t.id === resolvedTable.id
              ? { ...resolvedTable, selected: true }
              : { ...t, selected: false },
          ),
        );
        setActiveArea(resolvedTable.area);
        setOrderActionMessage(null);
        checkout.reset();

        // Await the full invoice refresh and read its returned snapshot directly — not
        // React state — to decide whether to reopen PaymentModal, so that decision can't be
        // made against not-yet-settled invoiceListLoading/invoiceListOrderId. One retry
        // covers the (now normally unreachable, since the reactive effect above no longer
        // interferes while suppressed) case of the request being discarded as stale.
        let invoiceSnapshot = await checkout.refreshInvoices(
          orderId,
          invoiceId ?? null,
        );
        if (!invoiceSnapshot) {
          invoiceSnapshot = await checkout.refreshInvoices(
            orderId,
            invoiceId ?? null,
          );
        }
        if (!invoiceSnapshot) {
          throw new Error("Không thể tải hóa đơn để khôi phục.");
        }

        // Kept consistent with cash: a paid invoice always closes the payment modal — the
        // cashier reopens it deliberately via OrderPanel's "Xem lại hóa đơn đã thanh toán"
        // rather than the modal reappearing on its own.
        if (paymentResult === "PAID" || invoiceSnapshot.allActiveInvoicesPaid) {
          checkout.setRestoredPaymentOpen(false);
        } else {
          checkout.setRestoredPaymentOpen(true);
        }
        restored = true;
      } catch (err) {
        console.error(err);
        setVnpayFailureNotice(
          "Không thể khôi phục bàn/đơn hàng sau khi thanh toán VNPAY. Vui lòng thử lại.",
        );
      } finally {
        releaseAutoRefreshSuppression?.();
        if (restored) {
          // Clear the one-time context only after restoration has actually succeeded —
          // never before, and never on failure, so a retry (another focus, or a refresh)
          // can retry from the same stored context instead of silently falling back to the
          // generic screen.
          clearStoredVnpayReturnContext();
          navigate(location.pathname, { replace: true, state: null });
        }
      }
    },
    // Deliberately not exhaustive: the workspace and checkout methods are stable for this
    // restoration lifecycle, and location.pathname does not
    // change within this screen — re-running this identity on every render would defeat the
    // point of extracting it for the focus-listener effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Same-tab VNPAY return (router state, with a localStorage fallback for a hard reload).
  useEffect(() => {
    let state = location.state as VnpayReturnContext | null;
    if (!state?.txnRef) {
      state = readStoredVnpayReturnContext();
    }
    void restoreFromVnpayState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const areas = ["all", ...Array.from(new Set(tables.map((t) => t.area)))];
  const tablesInArea = (
    activeArea === "all" ? tables : tables.filter((t) => t.area === activeArea)
  ).filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  // Build the order panel's item list for the selected table from the live orders feed.
  useEffect(() => {
    if (!selectedTable || !selectedTable.occupied) {
      setOrderItems([]);
      return;
    }
    const tableOrders = activeOrders.filter(
      (o) =>
        o.tableId === selectedTable.id &&
        ACTIVE_ORDER_STATUSES.includes(o.status),
    );
    if (tableOrders.length === 0) {
      setOrderItems([]);
      return;
    }
    const combinedItems: OrderItem[] = tableOrders.flatMap((order) =>
      order.items
        .filter((i) => !(i.cookingStatus === "PENDING" && (i.isQrOrder ?? i.qrOrder)))
        .map((i) => ({
          id: i.orderItemId,
          name: i.menuItemName,
          qty: i.quantity,
          price: i.unitPrice,
          status: COOKING_STATUS_LABEL[i.cookingStatus],
          notes: i.note || "",
          rejectionNote: i.rejectionNote,
          orderId: order.id,
          isQrOrder: i.isQrOrder ?? i.qrOrder,
        })),
    );
    setOrderItems(combinedItems);
  }, [selectedTable, activeOrders]);

  const hasSelectedMenu = cart.length > 0;

  useEffect(() => {
    selectedTableIdRef.current = selectedTable?.id ?? "";
  }, [selectedTable?.id]);
  const selectedOrderCustomerKey = selectedOrder
    ? `${selectedOrder.id}|${selectedOrder.customerName ?? ""}|${selectedOrder.customerPhone ?? ""}|${selectedOrder.customerEmail ?? ""}`
    : `none|${selectedTable?.id ?? ""}`;

  // Once an order exists its stored contact is the source of truth; with no order the
  // draft is kept as typed and only reset when the cashier moves to another table.
  useEffect(() => {
    if (selectedOrder) {
      setCustomerDraft({
        customerName: selectedOrder.customerName ?? "",
        customerPhone: selectedOrder.customerPhone ?? "",
        customerEmail: selectedOrder.customerEmail ?? "",
      });
    } else {
      setCustomerDraft({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
      });
    }
    // Keyed on the stored values so a save or a table switch re-seeds, but typing does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderCustomerKey]);

  const pendingOrders = activeOrders.filter(
    (o) =>
      o.status === "PENDING" ||
      (o.status !== "CANCELLED" &&
        o.status !== "CLOSED" &&
        o.items.some(
          (i) => i.cookingStatus === "PENDING" && (i.isQrOrder || i.qrOrder),
        )),
  );
  const pendingOrdersCount = pendingOrders.length;
  const {
    canCloseOrder: canCloseSelectedOrder,
    emptyOrderWithoutInvoice,
    itemMutationDisabled: disableItemMutation,
    itemMutationDisabledMessage,
    checkoutDisabled,
    checkoutLabel,
  } = checkout.status;

  const showItemMutationBlockedMessage = () => {
    setOrderActionMessage({
      type: "error",
      text: itemMutationDisabledMessage,
    });
  };

  // A VNPAY attempt opened by the checkout module runs in a separate tab, so a payment
  // settled there (or abandoned) never touches this tab's state on its own — that tab writes
  // the outcome to the shared localStorage context and closes itself instead of navigating.
  // Whenever this tab regains focus: if that context is waiting, run the same restore flow a
  // same-tab VNPAY return uses (selects the right table, shows the success/failure notice,
  // closes the payment modal on a paid invoice — kept consistent with cash); otherwise just
  // refresh the selected invoice, in case something changed while this tab was in the
  // background for an unrelated reason.
  useEffect(() => {
    const onFocus = () => {
      const pending = readStoredVnpayReturnContext();
      if (pending?.txnRef) {
        void restoreFromVnpayState(pending);
      } else if (selectedOrderId) {
        void checkout.refreshInvoices(
          selectedOrderId,
          checkout.selectedInvoiceId,
        );
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, checkout.selectedInvoiceId]);

  const handleQtyChange = (id: string, delta: number) => {
    if (delta > 0) {
      const menuItem = menuItems.find((m) => m.id === id);
      if (menuItem) {
        setCart((prev) => {
          const existing = prev.find((c) => c.menuItemId === id);
          if (existing) {
            // Increment qty on existing entry
            return prev.map((c) =>
              c.menuItemId === id ? { ...c, qty: c.qty + 1 } : c,
            );
          }
          // Add new grouped entry
          return [
            ...prev,
            {
              cartItemId: Math.random().toString(36).substring(2, 11),
              menuItemId: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              qty: 1,
              note: "",
            },
          ];
        });
      }
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.menuItemId === id);
        if (!existing) return prev;
        if (existing.qty <= 1) {
          // Remove entry entirely
          return prev.filter((c) => c.menuItemId !== id);
        }
        // Decrement qty
        return prev.map((c) =>
          c.menuItemId === id ? { ...c, qty: c.qty - 1 } : c,
        );
      });
    }
    setMenuItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
      ),
    );
  };

  const handleTableSelect = (id: string | null) => {
    const previousTableId = tables.find((table) => table.selected)?.id;
    if (previousTableId && previousTableId !== id) {
      setCart([]);
      setMenuItems((items) => items.map((item) => ({ ...item, qty: 0 })));
      setWalkInOverrideTableId(null);
    }
    setTables((ts) => ts.map((t) => ({ ...t, selected: t.id === id })));
    setOrderActionMessage(null);
    checkout.reset();
    if (id) {
      const selected = tables.find((t) => t.id === id);
      if (selected) {
        setActiveArea(selected.area);
      }
    }
  };

  // ── Reservation action handlers ───────────────────────────────────────────

  const handleReservationCheckIn = async () => {
    const res = selectedTable?.upcomingReservation;
    if (!res) return;
    setReservationLoading(true);
    setReservationError(null);
    try {
      await checkInReservation(res.id);
      // Bug fix: refreshTables() used to be fire-and-forget here, so loading cleared (and the
      // button re-enabled) before the table list actually reflected the check-in — a cashier
      // clicking again in that window got a confusing INVALID_STATUS_TRANSITION for a check-in
      // that had already succeeded. Await it so the panel only switches to OrderPanel once the
      // fresh state has actually landed, and the button stays disabled until then.
      await refreshTables();
    } catch (e) {
      setReservationError(
        e instanceof Error ? e.message : "Check-in thất bại, vui lòng thử lại",
      );
    } finally {
      setReservationLoading(false);
    }
  };

  const handleReservationCancel = () => {
    if (!selectedTable?.upcomingReservation) return;
    setReservationCancelConfirmOpen(true);
  };

  const executeReservationCancel = async () => {
    const res = selectedTable?.upcomingReservation;
    setReservationCancelConfirmOpen(false);
    if (!res) return;
    setReservationLoading(true);
    setReservationError(null);
    try {
      await cancelStaffReservation(res.id);
      // Deselect table, then refresh to pick up AVAILABLE status
      setTables((ts) => ts.map((t) => ({ ...t, selected: false })));
      await refreshTables();
    } catch (e) {
      setReservationError(
        e instanceof Error
          ? e.message
          : "Hủy đặt bàn thất bại, vui lòng thử lại",
      );
    } finally {
      setReservationLoading(false);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    orderItemId: string,
    statusLabel: string,
  ) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    const status = COOKING_STATUS_FROM_LABEL[statusLabel];
    if (!status) return;

    if (status === "REJECTED") {
      setRejectModal({ open: true, orderId, itemId: orderItemId, text: "" });
      return;
    }

    setOrderActionMessage(null);
    try {
      await updateOrderItemStatus(orderId, orderItemId, status);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };
  const handleRemoveItem = (orderId: string, orderItemId: string) => {
    setRemoveConfirmModal({ open: true, orderId, orderItemId });
  };

  const executeRemoveItem = async () => {
    const { orderId, orderItemId } = removeConfirmModal;
    setRemoveConfirmModal({ open: false, orderId: null, orderItemId: null });
    if (!orderId || !orderItemId) return;
    if (orderId === "cart") {
      const itemToRemove = cart.find((c) => c.cartItemId === orderItemId);
      if (itemToRemove) {
        setCart((prev) => prev.filter((c) => c.cartItemId !== orderItemId));
        setMenuItems((items) =>
          items.map((item) =>
            item.id === itemToRemove.menuItemId
              ? { ...item, qty: Math.max(0, item.qty - 1) }
              : item,
          ),
        );
      }
      return;
    }
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await removeOrderItem(orderId, orderItemId);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCancelOrder = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setCancelConfirmModal({ open: true, orderIds });
  };

  const executeCancelOrder = async () => {
    const { orderIds } = cancelConfirmModal;
    setCancelConfirmModal({ open: false, orderIds: [] });
    if (orderIds.length === 0) return;

    setOrderActionMessage(null);
    try {
      await Promise.all(
        orderIds.map((orderId) => cancelOrder(orderId, "Hủy bởi thu ngân")),
      );
      setOrderActionMessage(null);
      setRefreshTrigger((t) => t + 1);
      setCart([]);
      handleTableSelect(null);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleOpenNote = (itemId: string, currentText: string) =>
    setNoteModal({ open: true, itemId, text: currentText });
  const handleConfirmNote = async (itemId: string, text: string) => {
    const isDraft = cart.some((i) => i.cartItemId === itemId);

    if (isDraft) {
      setCart((prevCart) =>
        prevCart.map((i) =>
          i.cartItemId === itemId ? { ...i, note: text } : i,
        ),
      );
    } else {
      // Find the item in orderItems to get the orderId
      const item = orderItems.find((i) => i.id === itemId);
      if (item && item.orderId) {
        if (disableItemMutation) {
          showItemMutationBlockedMessage();
          return;
        }
        try {
          await updateOrderItemNote(item.orderId, itemId, text);
          setOrderItems((items) =>
            items.map((i) => (i.id === itemId ? { ...i, notes: text } : i)),
          );
          setRefreshTrigger((t) => t + 1);
        } catch (e) {
          console.error(e);
          setOrderActionMessage({
            type: "error",
            text: getOrderActionErrorMessage(e),
          });
        }
      }
    }
    setNoteModal({ open: false, itemId: null, text: "" });
  };
  const handleCancelNote = () =>
    setNoteModal({ open: false, itemId: null, text: "" });

  const handleOpenReject = (orderId: string, itemId: string) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    setRejectModal({ open: true, orderId, itemId, text: "" });
  };

  const handleConfirmReject = async (
    orderId: string,
    itemId: string,
    text: string,
  ) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await updateOrderItemStatus(orderId, itemId, "REJECTED", text);
      setRefreshTrigger((t) => t + 1);
      setRejectModal({ open: false, orderId: null, itemId: null, text: "" });
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCancelReject = () =>
    setRejectModal({ open: false, orderId: null, itemId: null, text: "" });

  const handleCloseOrder = async () => {
    if (!selectedOrderId) return;
    const closedOrderId = selectedOrderId;
    const closedTableId = selectedTable?.id;
    setOrderActionMessage(null);
    try {
      await closeOrder(closedOrderId);
      checkout.reset();
      setActiveOrders((orders) =>
        orders.filter((order) => order.id !== closedOrderId),
      );
      setOrderItems([]);
      if (closedTableId) {
        setTables((currentTables) =>
          currentTables.map((table) =>
            table.id === closedTableId
              ? {
                  ...table,
                  orderId: null,
                  occupied: false,
                  amount: 0,
                  items: 0,
                  status: "AVAILABLE",
                }
              : table,
          ),
        );
      }
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleCreateOrder = async () => {
    if (createOrderSubmissionRef.current) return;
    if (cart.length === 0) {
      setTab("menu");
      return;
    }
    if (!selectedTable) return;

    const expectedTableId = selectedTable.id;
    createOrderSubmissionRef.current = true;
    setCreateOrderSubmitting(true);
    setOrderActionMessage(null);
    try {
      const createdOrder = await createOrder(
        expectedTableId,
        cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.qty,
          note: item.note,
        })),
        undefined,
        customerDraft,
      );
      setActiveOrders((orders) => [
        ...orders.filter((order) => order.id !== createdOrder.id),
        createdOrder,
      ]);
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === expectedTableId
            ? {
                ...table,
                occupied: true,
                status: "OCCUPIED",
                orderId: createdOrder.id,
                amount: createdOrder.totalAmount,
                items: createdOrder.items.reduce(
                  (total, item) => total + item.quantity,
                  0,
                ),
              }
            : table,
        ),
      );
      setWalkInOverrideTableId((id) => (id === expectedTableId ? null : id));
      if (selectedTableIdRef.current === expectedTableId) {
        setCart([]);
        setMenuItems((items) => items.map((item) => ({ ...item, qty: 0 })));
        setTab("table");
      }
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
      setRefreshTrigger((trigger) => trigger + 1);
    } finally {
      createOrderSubmissionRef.current = false;
      setCreateOrderSubmitting(false);
    }
  };

  // Seats a walk-in guest (AVAILABLE → OCCUPIED, or RESERVED → OCCUPIED while in walk-in-seating
  // mode) without creating an order yet — the "Tạo Order" button stays available right after for
  // when the guest is actually ready to order. Distinct from handleCreateOrder, which seats the
  // walk-in as an implicit side effect of adding items.
  const handleCheckInWalkIn = async () => {
    if (!selectedTable) return;
    const expectedTableId = selectedTable.id;
    setCheckInWalkInSubmitting(true);
    setOrderActionMessage(null);
    try {
      const updated = await checkInWalkIn(expectedTableId);
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === expectedTableId
            ? {
                ...table,
                status: updated.status,
                occupied: true,
                upcomingReservation: null,
                occupiedSince: updated.occupiedSince,
              }
            : table,
        ),
      );
      setWalkInOverrideTableId((id) => (id === expectedTableId ? null : id));
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    } finally {
      setCheckInWalkInSubmitting(false);
    }
  };

  // Undoes a mistaken "Check-in khách" click — only ever reachable before an order exists for
  // the table (see OrderPanel's canUndoWalkInCheckIn), so there's nothing else to unwind besides
  // the table status itself.
  const handleUndoWalkInCheckIn = async () => {
    if (!selectedTable) return;
    const expectedTableId = selectedTable.id;
    setUndoCheckInSubmitting(true);
    setOrderActionMessage(null);
    try {
      const updated = await undoWalkInCheckIn(expectedTableId);
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === expectedTableId
            ? {
                ...table,
                status: updated.status,
                occupied: false,
                occupiedSince: updated.occupiedSince,
              }
            : table,
        ),
      );
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    } finally {
      setUndoCheckInSubmitting(false);
    }
  };

  const handleAddItems = async () => {
    if (!selectedTable || !selectedTable.orderId) return;
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      await addOrderItems(
        selectedTable.orderId,
        cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.qty,
          note: c.note,
        })),
      );
      setCart([]);
      setMenuItems((items) => items.map((i) => ({ ...i, qty: 0 })));
      setTab("table");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const handleResolveAssistance = async (id: string) => {
    try {
      await respondAssistance(id);
      setAssistanceRequests((reqs) => reqs.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptPendingOrder = async (order: Order) => {
    try {
      await acceptOrder(order.id);
      setRefreshTrigger((t) => t + 1);
      setShowQRModal(false);
      handleTableSelect(order.tableId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPendingOrder = async (order: Order) => {
    if (disableItemMutation) {
      showItemMutationBlockedMessage();
      return;
    }
    setOrderActionMessage(null);
    try {
      const pendingItems = order.items.filter(
        (i) => i.cookingStatus === "PENDING" && (i.isQrOrder ?? i.qrOrder)
      );
      await Promise.all(
        pendingItems.map((i) => purgeOrderItem(order.id, i.orderItemId))
      );
      setRefreshTrigger((t) => t + 1);
      setShowQRModal(false);
    } catch (e) {
      console.error(e);
      setOrderActionMessage({
        type: "error",
        text: getOrderActionErrorMessage(e),
      });
    }
  };

  const filteredMenu = selectFilteredMenu(
    menuItems,
    activeMenuCategory,
    search,
  );
  const menuCategoryPills = selectMenuCategoryPills(
    menuItems,
    menuCategories,
  );
  const tableCounts = selectTableCounts(tablesInArea);
  if (shiftLoading) {
    // Mirrors the real page shell (header / tab+search row / area filters / table grid /
    // order panel) below, rather than a blank centered message, since this is the very first
    // paint the cashier sees on login.
    return (
      <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden font-sans">
        <div className="h-[72px] shrink-0 bg-white flex items-center justify-between px-4 lg:px-6">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24 rounded-[10px]" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="flex flex-1 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden">
          <div className="flex flex-col flex-1 gap-2.5 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between shrink-0">
              <Skeleton className="h-[52px] w-[260px] rounded-[12px]" />
              <Skeleton className="h-[44px] w-[160px] md:w-[220px] lg:w-[340px] rounded-[12px]" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-[34px] w-[120px] rounded-[8px]" />
              <Skeleton className="h-[34px] w-[100px] rounded-[8px]" />
              <Skeleton className="h-[34px] w-[100px] rounded-[8px]" />
            </div>
            <Skeleton className="h-6 w-32 shrink-0" />
            <div className="flex flex-wrap gap-3 pr-2 flex-1 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 items-center p-[10px] w-[184px] shrink-0"
                >
                  <div className="flex gap-[15px]">
                    <Skeleton className="h-[17px] w-[63px] rounded-[12px]" />
                    <Skeleton className="h-[17px] w-[63px] rounded-[12px]" />
                  </div>
                  <Skeleton className="h-[80px] w-[164px] rounded-[12px]" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="w-[260px] md:w-[300px] lg:w-[360px] xl:w-[400px] shrink-0 h-full rounded-[12px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden font-sans">
      {vnpayFailureNotice && (
        <PaymentResultToast
          variant="error"
          title={vnpayFailureNotice}
          onDismiss={() => setVnpayFailureNotice(null)}
        />
      )}
      <Header
        employeeName={user?.fullName ?? user?.username ?? "Nhân viên"}
        roleLabel={ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "Thu ngân"}
        shift={shift}
        assistanceRequests={assistanceRequests}
        onResolveRequest={handleResolveAssistance}
        onLogout={shiftSession.requestLogout}
        onChangePassword={() => setShowChangePw(true)}
        onCashMovement={shiftSession.requestCashMovement}
        onCloseShift={shiftSession.requestCloseShift}
      />

      {shift?.shiftType === "FLOATING" && shift.status === "OPEN" && (
        <div className="mx-3 lg:mx-4 mt-3 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[#025cca] text-[14px]">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Đây là ca tạm (hỗ trợ). Tiền thu được giữ riêng; khi xong hãy gộp
            vào ca chính.
          </div>
          <button
            className="kv-btn kv-btn-primary h-9 shrink-0"
            onClick={() => void shiftSession.requestMerge()}
          >
            Gộp vào ca chính
          </button>
        </div>
      )}

      {!shift && (
        <div className="mx-3 lg:mx-4 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-amber-700 text-[14px]">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>Ca thu ngân chưa mở — không thể tạo đơn hàng mới.</span>
          </div>
          <button
            onClick={shiftSession.requestOpenShift}
            className="shrink-0 h-8 px-3 rounded-lg bg-amber-500 text-white text-[13px] font-medium hover:bg-amber-600 transition-colors"
          >
            Mở ca
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-3 lg:gap-4 p-3 lg:p-4 overflow-hidden">
        <div className="flex flex-col flex-1 gap-2.5 min-w-0 overflow-hidden">
          {/* Bug fix: items-center used to re-center the toggle against the right column's
              height, which grows in "Phòng bàn" mode (search box + QR button) vs "Menu" mode
              (search box only) — the toggle visibly jumped position between the two tabs.
              items-start pins both to the row's top edge regardless of the right column's
              height. */}
          <div className="flex items-start justify-between shrink-0">
            <div className="flex h-[52px] rounded-[12px] overflow-hidden border-2 border-[#e8e8e8]">
              {(
                [
                  ["table", "Phòng bàn"],
                  ["menu", "Menu"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setSearch("");
                  }}
                  className={`flex-1 min-w-[120px] text-[18px] lg:text-[20px] transition-colors ${tab === id ? "bg-[#dceefe] text-[#025cca] font-semibold" : "bg-[#f5f5f5] text-[#636566] font-medium"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-3 bg-white rounded-[12px] px-4 h-[44px] w-[160px] md:w-[220px] lg:w-[340px]">
                <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === "menu" ? "Tìm món" : "Tìm bàn"}
                  className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
                />
              </div>
              {tab === "table" && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="bg-white shadow-sm border border-[#e8e8e8] px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-semibold text-[#202325] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 shrink-0 text-[#202325]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                    <span>{pendingOrdersCount} lượt gọi món qua QR</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {tab === "table" && (
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 min-h-[38px]">
              <div className="flex gap-2 flex-wrap">
                {areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setActiveArea(area)}
                    className={`px-4 py-1.5 rounded-[8px] border border-[#e8e8e8] text-[14px] transition-colors ${activeArea === area ? "bg-white text-[#37383a]" : "bg-[#f5f5f5] text-[#797b7c] hover:bg-white"}`}
                  >
                    {area === "all" ? "Tất cả khu vực" : area}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-5">
                {TABLE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="flex items-center gap-2 text-[14px]"
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${tableFilter === f.id ? "border-[#025cca]" : "border-[#37383a]"}`}
                    >
                      {tableFilter === f.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#025cca]" />
                      )}
                    </div>
                    <span className="text-black">
                      {f.label} ({tableCounts[f.id]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-[24px] font-semibold text-[#202325]">
              {tab === "menu" ? "Chọn món" : "Chọn bàn"}
            </h2>
          </div>

          <div className="flex flex-col flex-1 gap-2.5 overflow-hidden">
            {tab === "menu" ? (
              <MenuView
                items={filteredMenu}
                categories={menuCategoryPills}
                activeCategory={activeMenuCategory}
                onCategoryChange={setActiveMenuCategory}
                onRefresh={loadMenu}
                onQtyChange={handleQtyChange}
              />
            ) : tablesLoading ? (
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-3 pr-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-3 items-center p-[10px] w-[184px] shrink-0"
                    >
                      <div className="flex gap-[15px]">
                        <Skeleton className="h-[17px] w-[63px] rounded-[12px]" />
                        <Skeleton className="h-[17px] w-[63px] rounded-[12px]" />
                      </div>
                      <Skeleton className="h-[80px] w-[164px] rounded-[12px]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <TableView
                tables={tablesInArea}
                onSelect={handleTableSelect}
                filter={tableFilter}
              />
            )}
          </div>
        </div>

        {selectedTable &&
        selectedTable.upcomingReservation &&
        !selectedTable.occupied &&
        walkInOverrideTableId !== selectedTable.id ? (
          // Not gated on status === "RESERVED": a table also carries an upcomingReservation
          // once it frees back to AVAILABLE with a later same-day guest still CONFIRMED on it
          // (e.g. two reservations on one table — the first one's stay just closed). The
          // cashier still needs the check-in/no-show/cancel actions for that next guest, not
          // the walk-in order flow — unless they explicitly opt into seating a walk-in via
          // canSeatWalkIn/onSeatWalkIn below (mirrors OrderServiceImpl.create()'s server-side
          // >2h-away rule for a RESERVED table).
          <ReservationPanel
            table={selectedTable}
            onCheckIn={handleReservationCheckIn}
            onCancel={handleReservationCancel}
            loading={reservationLoading}
            error={reservationError}
            canSeatWalkIn={
              new Date(selectedTable.upcomingReservation.datetime).getTime() -
                currentTime >
              WALK_IN_MIN_GAP_MINUTES * 60000
            }
            onSeatWalkIn={() => setWalkInOverrideTableId(selectedTable.id)}
          />
        ) : (
          <OrderPanel
            items={[
              ...orderItems,
              ...cart.map((c) => ({
                id: c.cartItemId,
                name: c.name,
                qty: c.qty,
                notes: c.note,
                status: "MỚI",
                price: c.price,
                orderId: "cart",
              })),
            ]}
            hasSelectedMenu={hasSelectedMenu}
            onStatusChange={handleStatusChange}
            onCheckout={checkout.requestOpen}
            onCreateOrder={handleCreateOrder}
            onCheckInWalkIn={handleCheckInWalkIn}
            checkInWalkInSubmitting={checkInWalkInSubmitting}
            onUndoWalkInCheckIn={handleUndoWalkInCheckIn}
            undoCheckInSubmitting={undoCheckInSubmitting}
            onAddItems={handleAddItems}
            onNote={handleOpenNote}
            onRemoveItem={handleRemoveItem}
            onRejectItem={handleOpenReject}
            onCancelOrder={handleCancelOrder}
            selectedTable={selectedTable}
            customer={customerDraft}
            onCustomerChange={setCustomerDraft}
            onSaveCustomer={() => void checkout.saveCustomer(customerDraft)}
            customerSaving={checkout.customerSaving}
            customerError={checkout.customerError}
            orderExists={Boolean(selectedOrderId)}
            isWalkInSeating={
              !!selectedTable && walkInOverrideTableId === selectedTable.id
            }
            onCancelWalkInSeating={() => setWalkInOverrideTableId(null)}
            checkoutDisabled={checkoutDisabled}
            checkoutLabel={checkoutLabel}
            shiftOpen={!!shift}
            invoicePaid={canCloseSelectedOrder}
            itemMutationDisabled={disableItemMutation}
            itemMutationDisabledMessage={itemMutationDisabledMessage}
            orderActionMessage={orderActionMessage}
            createOrderSubmitting={createOrderSubmitting}
            emptyOrderMessage={
              emptyOrderWithoutInvoice ? EMPTY_ORDER_MESSAGE : undefined
            }
            cancelOrderIds={
              emptyOrderWithoutInvoice && selectedOrderId
                ? [selectedOrderId]
                : undefined
            }
            onCloseOrder={handleCloseOrder}
            onReopenPaidInvoice={checkout.reopenPaidInvoice}
            invoiceTools={null}
          />
        )}
      </div>

      {showQRModal && (
        <QROrderConfirmationModal
          orders={activeOrders}
          tables={tables}
          onClose={() => setShowQRModal(false)}
          onAccept={handleAcceptPendingOrder}
          onReject={handleRejectPendingOrder}
        />
      )}

      {removeConfirmModal.open && (
        <ConfirmActionModal
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa món này khỏi đơn hàng?"
          cancelLabel="Hủy"
          confirmLabel="Xóa"
          tone="warning"
          onCancel={() =>
            setRemoveConfirmModal({
              open: false,
              orderId: null,
              orderItemId: null,
            })
          }
          onConfirm={() => void executeRemoveItem()}
        />
      )}

      {cancelConfirmModal.open && (
        <ConfirmActionModal
          title="Hủy đơn hàng"
          message="Bạn có chắc chắn muốn hủy đơn hàng này?"
          onCancel={() =>
            setCancelConfirmModal({ open: false, orderIds: [] })
          }
          onConfirm={() => void executeCancelOrder()}
        />
      )}

      {reservationCancelConfirmOpen && selectedTable?.upcomingReservation && (
        <ConfirmActionModal
          title="Hủy đặt bàn"
          message={`Xác nhận hủy đặt bàn của khách "${selectedTable.upcomingReservation.guestName}"?`}
          onCancel={() => setReservationCancelConfirmOpen(false)}
          onConfirm={() => void executeReservationCancel()}
        />
      )}

      {orderActionMessage && orderActionMessage.type === "error" && (
        <ConfirmActionModal
          title="Thông báo"
          message={orderActionMessage.text}
          confirmLabel="Đóng"
          cancelLabel={null}
          tone="neutral"
          onCancel={() => setOrderActionMessage(null)}
          onConfirm={() => setOrderActionMessage(null)}
        />
      )}

      {checkout.overlays}
      {noteModal.open && noteModal.itemId !== null && (
        <AddNoteModal
          itemId={noteModal.itemId}
          initialText={noteModal.text}
          onConfirm={handleConfirmNote}
          onCancel={handleCancelNote}
        />
      )}
      {rejectModal.open &&
        rejectModal.itemId !== null &&
        rejectModal.orderId !== null && (
          <AddNoteModal
            itemId={rejectModal.itemId}
            initialText=""
            onConfirm={(itemId, text) =>
              handleConfirmReject(rejectModal.orderId!, itemId, text)
            }
            onCancel={handleCancelReject}
            title="Lý do hủy món"
          />
        )}
      {showChangePw && (
        <ChangePasswordModal onClose={() => setShowChangePw(false)} />
      )}
      {shiftSession.overlays}
    </div>
  );
};
export default CashierOrders;
