import { useEffect, useState } from "react";
import type { InvoiceViewTab } from "./invoiceLifecycle";

export type PaidFilter = "all" | "paid" | "unpaid";
export type LifecycleFilter = "all" | "SPLIT" | "MERGED";

export interface FilterState {
  orderId: string;
  paid: PaidFilter;
  lifecycle: LifecycleFilter;
}

interface Props {
  initialState: FilterState;
  tab: InvoiceViewTab;
  onApply: (filters: FilterState) => void;
  // Whether any legacy SPLIT-status invoice has been observed. With the partial-quantity
  // split contract, new splits stay ACTIVE and never produce a SPLIT row, so the "Đã tách"
  // filter is only offered when it could actually return something.
  hasSplitHistory: boolean;
}

const fieldCls =
  "w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors " +
  "placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary";

const InvoiceFilters = ({
  initialState,
  tab,
  onApply,
  hasSplitHistory,
}: Props) => {
  const [orderId, setOrderId] = useState(initialState.orderId);
  const [paid, setPaid] = useState<PaidFilter>(initialState.paid);
  const [lifecycle, setLifecycle] = useState<LifecycleFilter>(
    initialState.lifecycle,
  );

  // Switching tab clears the filter that does not apply there. The order-id search is
  // meaningful in both tabs, so it is deliberately preserved.
  useEffect(() => {
    setPaid("all");
    setLifecycle("all");
  }, [tab]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    onApply({ orderId: orderId.trim(), paid, lifecycle });
  };

  const resetFilters = () => {
    setOrderId("");
    setPaid("all");
    setLifecycle("all");
    onApply({ orderId: "", paid: "all", lifecycle: "all" });
  };

  const isHistory = tab === "history";

  return (
    <form onSubmit={applyFilters} className="flex flex-col gap-5">
      <div>
        <h2 className="text-h3 font-bold text-ink">Lọc hóa đơn</h2>
        <p className="text-sm text-ink-subtle mt-1">
          {isHistory
            ? "Tìm theo đơn hàng và loại lịch sử vòng đời"
            : "Tìm theo đơn hàng và trạng thái thanh toán"}
        </p>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-5">
        <label className="text-md font-semibold text-ink">Mã đơn hàng</label>
        <input
          className={fieldCls}
          placeholder="Nhập mã đơn hàng"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        />
      </div>

      {isHistory ? (
        <div className="flex flex-col gap-3 border-b border-line pb-5">
          <span className="text-md font-semibold text-ink">Vòng đời</span>
          {(
            [
              ["all", "Tất cả lịch sử"],
              ["SPLIT", "Đã tách"],
              ["MERGED", "Đã gộp"],
            ] as const
          )
            // "Đã tách" is offered only once a legacy SPLIT row is actually known to
            // exist — otherwise this option can only ever return an empty result.
            .filter(([value]) => value !== "SPLIT" || hasSplitHistory)
            .map(([value, label]) => (
            <label key={value} className="kv-radio">
              <input
                type="radio"
                name="invoice-lifecycle"
                checked={lifecycle === value}
                onChange={() => setLifecycle(value)}
              />
              <span className="kv-radio-dot" />
              <span className="kv-radio-text">{label}</span>
            </label>
          ))}
          <p className="text-sm text-ink-muted">
            Hóa đơn lịch sử không còn được thanh toán trực tiếp.
          </p>
        </div>
      ) : (
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
      )}

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
