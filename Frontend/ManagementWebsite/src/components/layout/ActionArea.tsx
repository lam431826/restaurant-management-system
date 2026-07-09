import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconFileText,
  IconChevronDown,
  IconBell,
  IconCircleHelp,
  IconCalendar,
  IconConciergeBell,
} from "../common/Icon";
import { helpLinks, cashierModes } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../api/auth";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import {
  getNotificationLogs,
  type NotificationLogDto,
} from "../../api/notifications";

const TEMPLATE_LABELS: Record<string, string> = {
  RESERVATION_CONFIRMATION: "Xác nhận đặt bàn",
  RESERVATION_CANCELLATION: "Hủy đặt bàn",
  RESERVATION_REMINDER: "Nhắc lịch đặt bàn",
  RESERVATION_PENDING: "Đặt bàn chờ duyệt",
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

const roleLabel: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  WAITER: "Phục vụ",
};
//import { logout } from '../../services/authApi'
import { clearAuth } from "../../services/tokenStorage";

type DropdownName = "cashier" | "notifications" | "help" | "user" | null;

const listItem =
  "flex items-center gap-3 px-5 py-2 text-md text-ink cursor-pointer min-h-[3.6rem] no-underline transition-colors hover:bg-[var(--kv-state-hover-bg)] hover:text-primary";

const menuRow =
  "flex items-center justify-between px-5 py-2 min-h-[3.6rem] text-md cursor-pointer text-ink transition-colors hover:bg-[var(--kv-state-hover-bg)]";

const ActionArea = () => {
  const [open, setOpen] = useState<DropdownName>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [notifLogs, setNotifLogs] = useState<NotificationLogDto[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "failed">("all");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const failedCount = notifLogs.filter((n) => n.status === "FAILED").length;

  useEffect(() => {
    if (open !== "notifications") return;
    setNotifLoading(true);
    getNotificationLogs({ size: 30 })
      .then((r) => setNotifLogs(r.data.data))
      .catch(() => {
        /* silent */
      })
      .finally(() => setNotifLoading(false));
  }, [open]);

  // const handleLogout = async () => {
  //   setOpen(null);
  //   try {
  //     await logout();
  //   } catch {
  //     /* ignore — clear local session regardless */
  //   }
  //   signOut();
  //   navigate("/login", { replace: true });
  // };

  const selectCashierMode = (id: number) => {
    setOpen(null);
    if (id === 12)
      navigate("/waiter"); // Lễ tân
    else if (id === 11) window.alert("Màn hình Nhà bếp đang được phát triển");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (name: DropdownName) =>
    setOpen((prev) => (prev === name ? null : name));

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Local logout must still complete when the backend is unavailable.
    } finally {
      clearAuth();
      setOpen(null);
      navigate("/login");
    }
  };

  const cashierIcon = (icon: string) =>
    icon === "ik-calendar-day" ? (
      <IconCalendar size={16} />
    ) : (
      <IconConciergeBell size={16} />
    );

  return (
    <>
      <div className="flex items-center gap-2" ref={ref}>
        {/* ── Thu ngân button group ── */}
        <div className="relative flex items-center">
          <div className="kv-btn-group">
            <button
              className="kv-btn kv-btn-outline-primary"
              onClick={() => {
                setOpen(null);
                navigate("/cashier");
              }}
            >
              <IconFileText size={15} />
              Thu ngân
            </button>
            <button
              className="kv-btn kv-btn-outline-primary"
              onClick={() => toggle("cashier")}
              aria-expanded={open === "cashier"}
            >
              <IconChevronDown size={14} />
            </button>
          </div>

          {open === "cashier" && (
            <div className="kv-float-container min-w-[15rem]">
              <ul className="list-none m-0 py-1">
                {cashierModes.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`${listItem} w-full bg-transparent border-none text-left`}
                      onClick={() => selectCashierMode(m.id)}
                    >
                      {cashierIcon(m.icon)}
                      <span>{m.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Notification bell ── */}
        <div className="relative flex items-center">
          <div className="relative inline-flex">
            <button
              className="kv-btn kv-btn-icon-only kv-btn-outline-primary"
              onClick={() => toggle("notifications")}
              aria-label="Thông báo email"
              aria-expanded={open === "notifications"}
            >
              <IconBell size={16} />
            </button>
            {failedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-danger rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5 pointer-events-none">
                {failedCount > 9 ? "9+" : failedCount}
              </span>
            )}
          </div>

          {open === "notifications" && (
            <div className="kv-float-container w-[38rem] max-h-[58rem] overflow-hidden flex flex-col p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h6 className="text-xl font-bold m-0">
                  Lịch sử email thông báo
                </h6>
              </div>
              <div className="flex px-5 gap-4 border-b border-line">
                <span
                  onClick={() => setNotifTab("all")}
                  className={`py-3 text-md font-semibold border-b-2 cursor-pointer ${notifTab === "all" ? "text-primary border-primary" : "text-ink-subtle border-transparent hover:text-ink"}`}
                >
                  Tất cả
                </span>
                <span
                  onClick={() => setNotifTab("failed")}
                  className={`py-3 text-md font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 ${notifTab === "failed" ? "text-primary border-primary" : "text-ink-subtle border-transparent hover:text-ink"}`}
                >
                  Thất bại
                  {failedCount > 0 && (
                    <span className="bg-danger text-white text-[11px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {failedCount}
                    </span>
                  )}
                </span>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10 text-md text-ink-muted">
                    Đang tải...
                  </div>
                ) : (
                  (() => {
                    const displayed = notifLogs.filter(
                      (n) => notifTab === "all" || n.status === "FAILED",
                    );
                    if (displayed.length === 0) {
                      return (
                        <div className="flex items-center justify-center px-5 py-12 text-md text-ink-muted">
                          {notifTab === "failed"
                            ? "Không có email thất bại"
                            : "Chưa có thông báo nào"}
                        </div>
                      );
                    }
                    return displayed.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-5 py-3 border-b border-line last:border-b-0 hover:bg-[var(--kv-state-hover-bg)]"
                      >
                        <div className="text-[1.4rem] mt-0.5 shrink-0">📧</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-md font-semibold text-ink">
                              {TEMPLATE_LABELS[log.template] ?? log.template}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                log.status === "SENT"
                                  ? "bg-[var(--kv-success)] text-white"
                                  : log.status === "FAILED"
                                    ? "bg-danger text-white"
                                    : "bg-yellow-500 text-white"
                              }`}
                            >
                              {log.status === "SENT"
                                ? "Đã gửi"
                                : log.status === "FAILED"
                                  ? "Thất bại"
                                  : "Đang gửi"}
                            </span>
                          </div>
                          <div className="text-sm text-ink-muted mt-0.5 truncate">
                            {log.recipient}
                          </div>
                          {log.status === "FAILED" && log.errorMessage && (
                            <div className="text-sm text-danger/70 mt-0.5 truncate">
                              {log.errorMessage}
                            </div>
                          )}
                          <div className="text-xs text-ink-muted mt-0.5">
                            {timeAgo(log.sentAt)}
                          </div>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Help ── */}
        <div className="relative flex items-center">
          <button
            className="kv-btn kv-btn-icon-only kv-btn-outline-primary"
            onClick={() => toggle("help")}
            aria-label="Hướng dẫn"
            aria-expanded={open === "help"}
          >
            <IconCircleHelp size={16} />
          </button>

          {open === "help" && (
            <div className="kv-float-container min-w-[21.5rem]">
              <ul className="list-none m-0 py-1">
                {helpLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={listItem}
                    >
                      {link.img ? (
                        <img
                          src={link.img}
                          alt=""
                          className="w-[1.8rem] h-[1.8rem] object-contain shrink-0"
                        />
                      ) : (
                        <IconCircleHelp size={16} color="var(--kv-primary)" />
                      )}
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── User / Avatar ── */}
        <div className="relative flex items-center">
          <button
            className="bg-none border-none p-0 cursor-pointer rounded-full flex items-center"
            onClick={() => toggle("user")}
            aria-label="Tài khoản"
            aria-expanded={open === "user"}
          >
            <div className="kv-avatar kv-avatar-md">
              <img
                src="/assets/avatar-empty.svg"
                alt=""
                className="kv-avatar-image"
              />
            </div>
          </button>

          {open === "user" && (
            <div className="kv-float-container w-[26rem]">
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="kv-avatar kv-avatar-md">
                  <img
                    src="/assets/avatar-empty.svg"
                    alt=""
                    className="kv-avatar-image"
                  />
                </div>
                <div>
                  <div className="text-md font-semibold text-ink">
                    {user?.fullName ?? user?.username}
                  </div>
                  <div className="text-sm text-ink-muted mt-0.5">
                    {roleLabel[user?.role ?? ""] ?? user?.role}
                  </div>
                </div>
              </div>

              <div className="h-px bg-line my-1" />

              <div className={menuRow}>
                <div>
                  <div>Hồ sơ cửa hàng</div>
                  <div className="text-sm text-ink-muted">restaurant101</div>
                </div>
              </div>

              <div className={menuRow}>
                <div>
                  <div>Chi nhánh</div>
                  <div className="text-sm text-ink-muted">
                    Chi nhánh trung tâm
                  </div>
                </div>
              </div>

              <div className="h-px bg-line my-1" />

              <div className={menuRow}>
                <span>Chủ đề</span>
              </div>

              <div className={menuRow}>
                <span>Ngôn ngữ</span>
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/flagsquare-vn.svg"
                    alt="Vietnamese"
                    className="w-5 h-5 rounded-xxs object-cover inline-block"
                  />
                  <span>Tiếng Việt</span>
                </div>
              </div>

              <div className="h-px bg-line my-1" />

              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  setShowChangePassword(true);
                }}
                className={`${menuRow} w-full bg-transparent border-none`}
              >
                Đổi mật khẩu
              </button>

              <div className="h-px bg-line my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className={`${menuRow} w-full text-danger hover:!bg-[var(--kv-action-danger-faded-bg)] bg-transparent border-none`}
              />
              <button
                type="button"
                onClick={handleLogout}
                className={`${menuRow} w-full border-none bg-transparent text-left text-danger hover:!bg-[var(--kv-action-danger-faded-bg)]`}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
};

export default ActionArea;
