import type { InvoiceSummary } from "../../../services/invoiceApi";
import type { MenuCategory } from "../../../services/menuService";
import type { Order } from "../../../services/orderApi";
import type { Category, MenuItem, TableItem } from "./types";

const BUSY_TABLE_STATUSES = new Set(["OCCUPIED", "BILLING", "RESERVED"]);

export const selectOrderInvoiceState = ({
  order,
  invoices,
  invoiceChecked,
}: {
  order: Order | undefined;
  invoices: InvoiceSummary[];
  invoiceChecked: boolean;
}) => {
  const activeInvoices = invoices.filter(
    (candidate) => candidate.status === "ACTIVE",
  );
  const itemCount =
    order?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const orderHasInvoice = invoices.length > 0;
  const orderIsFinal =
    order?.status === "CLOSED" || order?.status === "CANCELLED";

  return {
    activeInvoices,
    orderHasInvoice,
    orderIsFinal,
    canCloseOrder:
      !!order &&
      activeInvoices.length > 0 &&
      activeInvoices.every((candidate) => candidate.paid) &&
      !orderIsFinal,
    emptyOrderWithoutInvoice:
      !!order &&
      invoiceChecked &&
      !orderHasInvoice &&
      !orderIsFinal &&
      itemCount === 0,
    nonPayableRejectedItems:
      order?.items
        .filter((item) => item.cookingStatus === "REJECTED")
        .map((item) => ({
          id: item.orderItemId,
          name: item.menuItemName,
          quantity: item.quantity,
          note: item.rejectionNote,
        })) ?? [],
  };
};

export const selectCheckoutButton = ({
  invoiceAction,
  invoiceListLoading,
  selectedOrderId,
  selectedInvoiceId,
  invoiceChecked,
  activeInvoices,
  orderHasInvoice,
  emptyOrderWithoutInvoice,
}: {
  invoiceAction: string | null;
  invoiceListLoading: boolean;
  selectedOrderId: string;
  selectedInvoiceId: string | null;
  invoiceChecked: boolean;
  activeInvoices: InvoiceSummary[];
  orderHasInvoice: boolean;
  emptyOrderWithoutInvoice: boolean;
}) => ({
  disabled:
    invoiceAction !== null ||
    invoiceListLoading ||
    !selectedOrderId ||
    emptyOrderWithoutInvoice ||
    (orderHasInvoice ? !selectedInvoiceId : !invoiceChecked),
  label: orderHasInvoice
    ? activeInvoices.some((candidate) => !candidate.paid)
      ? "Mở thanh toán"
      : "Mở hóa đơn"
    : invoiceChecked
      ? "Tạo hóa đơn"
      : "Đang kiểm tra hóa đơn",
});

export const selectFilteredMenu = (
  items: MenuItem[],
  categoryId: string,
  search: string,
) => {
  const normalizedSearch = search.trim().toLocaleLowerCase("vi-VN");
  return items.filter(
    (item) =>
      (categoryId === "all" || item.categoryId === categoryId) &&
      (!normalizedSearch ||
        item.name.toLocaleLowerCase("vi-VN").includes(normalizedSearch)),
  );
};

export const selectMenuCategoryPills = (
  items: MenuItem[],
  categories: MenuCategory[],
): Category[] => [
  { id: "all", label: "Tất Cả", count: items.length },
  ...categories
    .map((category) => ({
      id: category.id,
      label: category.name,
      count: category.itemCount,
    }))
    .sort((left, right) => right.count - left.count),
];

export const selectTableCounts = (
  tables: TableItem[],
): Record<string, number> => ({
  all: tables.length,
  used: tables.filter((table) => BUSY_TABLE_STATUSES.has(table.status)).length,
  empty: tables.filter((table) => !BUSY_TABLE_STATUSES.has(table.status)).length,
});
