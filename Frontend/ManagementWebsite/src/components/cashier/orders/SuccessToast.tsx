import type { ComponentType } from "react";
import { CheckIcon, CrossIcon, XIcon } from "./icons";

/* ─── Payment result toast ───────────────────────────────────────────────────
   Shared card used for every payment outcome notice (cash, same-tab VNPAY
   reconcile, and the popup-tab VNPAY return) so success and failure always
   read as the same kind of message to the cashier, just in a different
   color — never a bordered card for one and a plain color pill for the
   other. */
const VARIANT = {
  success: {
    cardBg: "bg-[#dcf7ea]",
    cardBorder: "border-[#48c185]",
    iconBg: "bg-[#48c185]",
    text: "text-[#286b4a]",
    hoverText: "hover:text-[#1a4a30]",
    Icon: CheckIcon as ComponentType,
  },
  error: {
    cardBg: "bg-[#fdeceb]",
    cardBorder: "border-[#f1a9a4]",
    iconBg: "bg-[#d92d20]",
    text: "text-[#a52017]",
    hoverText: "hover:text-[#7a1f16]",
    Icon: CrossIcon as ComponentType,
  },
} as const;

export const PaymentResultToast = ({
  variant,
  title,
  subtitle,
  onDismiss,
}: {
  variant: "success" | "error";
  title: string;
  subtitle?: string;
  onDismiss: () => void;
}) => {
  const v = VARIANT[variant];
  const Icon = v.Icon;
  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 ${v.cardBg} border ${v.cardBorder} rounded-[16px] px-5 py-4 shadow-lg`}
      style={{ minWidth: 360 }}
    >
      <div className={`w-9 h-9 ${v.iconBg} rounded-full flex items-center justify-center shrink-0`}>
        <Icon />
      </div>
      <div className="flex flex-col flex-1">
        <p className={`text-[16px] font-semibold ${v.text} leading-[1.5]`}>{title}</p>
        {subtitle && <p className={`text-[14px] ${v.text} leading-[1.5]`}>{subtitle}</p>}
      </div>
      <button
        onClick={onDismiss}
        className={`${v.text} ${v.hoverText} transition-colors`}
      >
        <XIcon />
      </button>
    </div>
  );
};

export const SuccessToast = ({
  total,
  onDismiss,
}: {
  total: number;
  onDismiss: () => void;
}) => (
  <PaymentResultToast
    variant="success"
    title="Thanh toán thành công!"
    subtitle={`Tổng: ${total.toLocaleString("vi-VN")} đ`}
    onDismiss={onDismiss}
  />
);
