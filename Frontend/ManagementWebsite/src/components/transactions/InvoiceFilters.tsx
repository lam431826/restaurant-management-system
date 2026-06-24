import { useState } from "react";

export type PaidFilter = "all" | "paid" | "unpaid";

export interface FilterState {
  orderId: string;
  paid: PaidFilter;
}

interface Props {
  initialState: FilterState;
  onApply: (filters: FilterState) => void;
}

const fieldCls =
  "w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors " +
  "placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary";

const InvoiceFilters = ({ initialState, onApply }: Props) => {
  const [orderId, setOrderId] = useState(initialState.orderId);
  const [paid, setPaid] = useState<PaidFilter>(initialState.paid);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    onApply({ orderId: orderId.trim(), paid });
  };

  const resetFilters = () => {
    setOrderId("");
    setPaid("all");
    onApply({ orderId: "", paid: "all" });
  };

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-5">
      <div>
        <h2 className="text-h3 font-bold text-ink">Lọc hóa đơn</h2>
        <p className="text-sm text-ink-subtle mt-1">
          Tìm theo đơn hàng và trạng thái thanh toán
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Mã đơn hàng</label>
        <input
          className={fieldCls}
          placeholder="Nhập orderId"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-line pb-5">
        <span className="text-md font-semibold text-ink">Thanh toán</span>
        {(
          [
            ["all", "Tất cả"],
            ["paid", "Đã thanh toán"],
            ["unpaid", "Chưa thanh toán"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="kv-radio">
            <input
              type="radio"
              name="invoice-paid"
              checked={paid === value}
              onChange={() => setPaid(value)}
            />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button type="submit" className="kv-btn kv-btn-primary h-10 w-full">
          Áp dụng bộ lọc
        </button>
        <button
          type="button"
          className="kv-btn kv-btn-outline-neutral h-10 w-full"
          onClick={resetFilters}
        >
          Đặt lại
        </button>
      </div>
    </form>
  );
};

export default InvoiceFilters;
