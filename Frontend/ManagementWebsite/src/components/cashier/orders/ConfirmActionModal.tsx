import type { ReactNode } from "react";

type ConfirmTone = "danger" | "warning" | "neutral";

interface ConfirmActionModalProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string | null;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneStyles: Record<ConfirmTone, { icon: string; button: string }> = {
  danger: {
    icon: "bg-red-100 text-[#dc2f02]",
    button: "bg-[#dc2f02] hover:bg-[#9d0208]",
  },
  warning: {
    icon: "bg-orange-100 text-orange-500",
    button: "bg-[#dc2f02] hover:bg-[#9d0208]",
  },
  neutral: {
    icon: "bg-gray-100 text-gray-700",
    button: "bg-gray-900 hover:bg-gray-800",
  },
};

export const ConfirmActionModal = ({
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Đóng",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) => {
  const styles = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${styles.icon}`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <div className="text-sm text-gray-600 mb-6">{message}</div>
        <div className="flex gap-3 w-full">
          {cancelLabel !== null && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 text-white font-bold py-2.5 rounded-xl transition-colors ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
