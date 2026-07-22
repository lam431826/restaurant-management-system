import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationLogDto } from "../../api/notifications";
import type { ReservationDto } from "../../api/reservations";
import {
  ChevronDownIcon,
  SwitchScreenIcon,
  LogoutIcon,
} from "../cashier/orders/icons";

type Tab = "calendar" | "list";

const TEMPLATE_LABELS: Record<string, string> = {
  RESERVATION_CONFIRMATION: "Xác nhận đặt bàn",
  RESERVATION_CANCELLATION: "Hủy đặt bàn",
  RESERVATION_REMINDER: "Nhắc lịch đặt bàn",
  RESERVATION_PENDING: "Đặt bàn chờ duyệt",
  RESERVATION_TABLE_UPDATE: "Cập nhật bàn ngồi",
  PAYMENT_CONFIRMATION: "Xác nhận thanh toán",
  MANUAL: "Thủ công",
};

const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

interface Props {
  onLogout?: () => void;
  onChangePassword?: () => void;
  notifLogs?: NotificationLogDto[];
  notifLoading?: boolean;
  bellOpen?: boolean;
  onBellToggle?: () => void;
  newReservations?: ReservationDto[];
  unseenNotifCount?: number;
  onOpenReservation?: (dto: ReservationDto) => void;
  employeeName?: string;
  roleLabel?: string;
  role?: string;
}

const ReservationHeader = ({
  onLogout,
  onChangePassword,
  notifLogs = [],
  notifLoading = false,
  bellOpen = false,
  onBellToggle,
  newReservations = [],
  unseenNotifCount = 0,
  onOpenReservation,
  employeeName = "Nhân viên",
  roleLabel = "Phục vụ",
  role,
}: Props) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
      if (
        bellRef.current &&
        !bellRef.current.contains(e.target as Node) &&
        bellOpen
      )
        onBellToggle?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen, onBellToggle]);

  const failedCount = notifLogs.filter((n) => n.status === "FAILED").length;
  const unseenTotal = newReservations.length + unseenNotifCount;
  const alertCount = unseenTotal > 0 ? unseenTotal : failedCount;

  const initials = employeeName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-[#e8e8e8] z-[50]">
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/images/wasabi-logo.svg"
          alt="Wasabi"
          className="h-12 w-auto"
        />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            className="text-[#202325] relative p-2 hover:bg-[#f5f5f5] rounded-md transition-colors"
            onClick={onBellToggle}
            aria-label="Thông báo"
            aria-expanded={bellOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {alertCount > 0 && (
              <span
                className={`absolute top-0 right-0 text-white text-[10px] font-bold min-w-[1rem] h-4 rounded-full flex items-center justify-center px-0.5 ${unseenTotal > 0 ? "bg-[#025cca]" : "bg-red-400"}`}
              >
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-[10px] shadow-lg border border-[#e8e8e8] w-[36rem] z-50 flex flex-col overflow-hidden max-h-[50rem]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8]">
                <span className="text-[15px] font-bold text-[#202325]">
                  Thông báo
                </span>
              </div>

              {newReservations.length > 0 && (
                <div className="border-b border-[#e8e8e8]">
                  <div className="px-4 pt-3 pb-1 text-[12px] font-bold text-[#025cca] uppercase tracking-wide">
                    Đặt bàn mới ({newReservations.length})
                  </div>
                  {newReservations.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onOpenReservation?.(r);
                        onBellToggle?.();
                      }}
                      className="flex items-start gap-3 px-4 py-3 border-t border-[#f0f0f0] hover:bg-[#f0f6ff] w-full text-left bg-transparent"
                    >
                      <div className="text-[1.3rem] mt-0.5 shrink-0">🔔</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-[#202325]">
                          {r.guestName} — {r.partySize} khách
                        </div>
                        <div className="text-[12px] text-[#636566] mt-0.5">
                          {r.phone}
                          {r.note ? ` · ${r.note}` : ""}
                        </div>
                        <div className="text-[12px] text-[#797b7c] mt-0.5">
                          {new Date(r.datetime).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 text-[12px] font-semibold text-[#797b7c] border-b border-[#e8e8e8]">
                Kết quả gửi email thông báo
              </div>

              <div className="overflow-y-auto flex-1">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10 text-[14px] text-[#797b7c]">
                    Đang tải...
                  </div>
                ) : notifLogs.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-[14px] text-[#797b7c]">
                    Chưa có thông báo nào
                  </div>
                ) : (
                  notifLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-3 border-b border-[#e8e8e8] last:border-b-0 hover:bg-[#f9fafb]"
                    >
                      <div className="text-[1.3rem] mt-0.5 shrink-0">📧</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-[#202325]">
                            {TEMPLATE_LABELS[log.template] ?? log.template}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                              log.status === "SENT"
                                ? "bg-green-500 text-white"
                                : log.status === "FAILED"
                                  ? "bg-red-500 text-white"
                                  : "bg-yellow-500 text-white"
                            }`}
                            title={
                              log.status === "SENT"
                                ? "Server đã chấp nhận — không đảm bảo vào hòm thư (có thể bị bounce hoặc vào thư rác)"
                                : undefined
                            }
                          >
                            {log.status === "SENT"
                              ? "Đã gửi đi"
                              : log.status === "FAILED"
                                ? "Thất bại"
                                : "Đang gửi"}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#636566] mt-0.5 truncate">
                          {log.recipient}
                        </div>
                        {log.status === "FAILED" && log.errorMessage && (
                          <div className="text-[11px] text-red-400 mt-0.5 truncate">
                            {log.errorMessage}
                          </div>
                        )}
                        <div className="text-[11px] text-[#797b7c] mt-0.5">
                          {log.sentAt ? timeAgo(log.sentAt) : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-[#e8e8e8] bg-[#f9fafb]">
                <p className="text-[11px] text-[#979899] leading-relaxed">
                  * "Đã gửi đi" = server nhận thư thành công. Email vẫn có thể
                  bị bounce hoặc vào thư rác nếu địa chỉ không hợp lệ.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <div className="w-9 h-9 rounded-full bg-[#5B8FE8] flex items-center justify-center text-white text-[13px] font-semibold">
              {initials}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[14px] font-medium text-[#202325]">
                {employeeName}
              </span>
              <span className="text-[12px] text-[#636566]">{roleLabel}</span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-[#e8e8e8] rounded-[12px] shadow-lg w-[200px] py-1 z-50">
              <div className="px-4 py-2 border-b border-[#e8e8e8]">
                <p className="text-[14px] font-semibold text-[#202325] truncate">
                  {employeeName}
                </p>
                <p className="text-[12px] text-[#636566]">{roleLabel}</p>
              </div>
              {role === "MANAGER" && (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/manager/dashboard");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
                  >
                    <SwitchScreenIcon />
                    Màn Quản lý
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/cashier");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
                  >
                    <SwitchScreenIcon />
                    Màn Thu ngân
                  </button>
                  <div className="h-px bg-[#e8e8e8] mx-2" />
                </>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/my-profile");
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
              >
                <SwitchScreenIcon />
                Hồ sơ của tôi
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onChangePassword?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
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
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Đổi mật khẩu
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <LogoutIcon />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ReservationHeader;
export type { Tab as ReservationTab };
