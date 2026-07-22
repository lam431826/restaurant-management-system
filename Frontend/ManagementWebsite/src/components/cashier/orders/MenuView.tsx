import { assetUrl } from "../../../services/api";
import type { MenuItem, Category } from "./types";
import { TagIcon, MinusIcon, PlusIcon, RefreshIcon } from "./icons";

/* ─── Menu view ──────────────────────────────────────────────────────────── */
const MenuItemCard = ({
  item,
  onQtyChange,
}: {
  item: MenuItem;
  onQtyChange: (id: string, d: number) => void;
}) => (
  <div
    className={`bg-white flex flex-col gap-4 p-4 rounded-[16px] w-[220px] shrink-0 overflow-hidden relative ${item.available ? "" : "opacity-60"}`}
  >
    {!item.available && (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <span className="bg-[#797b7c] flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-[16px] text-[12px] font-semibold text-white">
          <TagIcon /> Hết hàng
        </span>
      </div>
    )}
    <div className="h-[150px] rounded-[16px] overflow-hidden shrink-0 bg-[#f5f5f5]">
      <img
        src={item.imageUrl ? assetUrl(item.imageUrl) : "/images/food-item.jpg"}
        alt={item.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-[16px] font-medium text-[#202325]">{item.name}</p>
      <p className="text-[12px] text-[#636566] leading-[1.5] line-clamp-2">
        {item.description}
      </p>
    </div>
    <div className="flex items-end justify-between gap-2">
      <p className="text-[16px] font-semibold text-[#202325] whitespace-nowrap">
        {item.price.toLocaleString("vi-VN")}đ
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onQtyChange(item.id, -1)}
          disabled={!item.available}
          className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center hover:bg-[#e8e8e8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MinusIcon />
        </button>
        <span className="text-[20px] font-semibold text-[#202325] w-5 text-center">
          {item.qty}
        </span>
        <button
          onClick={() => onQtyChange(item.id, 1)}
          disabled={!item.available}
          className="w-8 h-8 rounded-full bg-[#025cca] flex items-center justify-center hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon white />
        </button>
      </div>
    </div>
  </div>
);

export const MenuView = ({
  items,
  categories,
  activeCategory,
  onCategoryChange,
  onRefresh,
  onQtyChange,
}: {
  items: MenuItem[];
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  onRefresh?: () => void;
  onQtyChange: (id: string, d: number) => void;
}) => {
  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`flex items-center gap-1.5 h-[38px] px-2 rounded-[8px] border shrink-0 transition-colors ${activeCategory === cat.id ? "bg-white border-[#e8e8e8] text-[#37383a]" : "bg-[#f5f5f5] border-[#e8e8e8] text-[#797b7c]"}`}
          >
            <span className="text-[14px]">{cat.label}</span>
            <span
              className={`flex items-center justify-center h-6 w-7 rounded-[12px] text-[14px] ${activeCategory === cat.id ? "bg-[#68b5fb] text-white" : "bg-[#e8e8e8] text-[#797b7c]"}`}
            >
              {cat.count}
            </span>
          </button>
        ))}
        <button
          onClick={onRefresh}
          className="ml-auto shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#636566] hover:bg-[#f5f5f5]"
        >
          <RefreshIcon />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2.5 p-2.5">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} onQtyChange={onQtyChange} />
          ))}
          {items.length === 0 && (
            <p className="text-[14px] text-[#797b7c] px-2.5 py-6">
              Không có món nào
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
