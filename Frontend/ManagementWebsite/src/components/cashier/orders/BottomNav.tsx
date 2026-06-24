import type { ReactNode } from "react";
import { HomeIcon, OrdersIcon, GridIcon, MoreIcon, PlusIcon } from "./icons";

/* ─── BottomNav ──────────────────────────────────────────────────────────── */
export const BottomNav = ({ active = "orders" }: { active?: string }) => {
  const items: { id: string; label: string | null; icon: ReactNode }[] = [
    {
      id: "home",
      label: "Home",
      icon: <HomeIcon active={active === "home"} />,
    },
    {
      id: "orders",
      label: "Orders",
      icon: <OrdersIcon active={active === "orders"} />,
    },
    { id: "fab", label: null, icon: null },
    { id: "transition", label: "Transition", icon: <GridIcon /> },
    { id: "more", label: "More", icon: <MoreIcon /> },
  ];
  return (
    <nav className="bg-white border-t border-[#e8e8e8] flex items-center justify-around h-[72px] shrink-0 relative px-4">
      {items.map((item) =>
        item.id === "fab" ? (
          <button
            key="fab"
            className="w-14 h-14 bg-[#025cca] rounded-full flex items-center justify-center shadow-lg -mt-7 hover:bg-[#0250b0] transition-colors"
          >
            <PlusIcon white />
          </button>
        ) : (
          <button
            key={item.id}
            className={`flex flex-col items-center gap-1 ${active === item.id ? "text-[#025cca]" : "text-[#636566]"}`}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ),
      )}
    </nav>
  );
};
