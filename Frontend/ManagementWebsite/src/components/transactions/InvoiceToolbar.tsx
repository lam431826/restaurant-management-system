import type { InvoiceSummary } from "../../services/invoiceApi";

interface Props {
  invoices: InvoiceSummary[];
  loading: boolean;
  onGenerate: () => void;
  onRefresh: () => void;
}

const exportCsv = (invoices: InvoiceSummary[]) => {
  const header = [
    "Mã hóa đơn",
    "Mã đơn hàng",
    "Thời gian",
    "Tạm tính",
    "Giảm giá",
    "Tổng thanh toán",
    "Trạng thái",
  ];
  const rows = invoices.map((invoice) => [
    invoice.id,
    invoice.orderId,
    invoice.createdAt,
    invoice.subtotal,
    invoice.discountAmount,
    invoice.totalAmount,
    invoice.paid ? "Đã thanh toán" : "Chưa thanh toán",
  ]);
  const csv = [header, ...rows]
    .map((line) =>
      line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hoa-don-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const InvoiceToolbar = ({
  invoices,
  loading,
  onGenerate,
  onRefresh,
}: Props) => (
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h1 className="text-h3 font-bold text-ink">Hóa đơn</h1>
      <p className="text-md text-ink-subtle mt-1">
        Tạo hóa đơn và quản lý giảm giá theo đơn hàng
      </p>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        className="kv-btn kv-btn-primary h-10"
        onClick={onGenerate}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Tạo hóa đơn
      </button>
      <button
        type="button"
        className="kv-btn kv-btn-outline-neutral h-10 bg-card"
        onClick={onRefresh}
        disabled={loading}
      >
        Làm mới
      </button>
      <button
        type="button"
        className="kv-btn kv-btn-outline-primary h-10 bg-card"
        onClick={() => exportCsv(invoices)}
        disabled={invoices.length === 0}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Xuất file
      </button>
    </div>
  </div>
);

export default InvoiceToolbar;
