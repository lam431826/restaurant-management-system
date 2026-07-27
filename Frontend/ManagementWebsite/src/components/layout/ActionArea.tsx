import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IconSettings } from "../common/Icon";
import { useAuth } from "../../context/useAuth";
import { logout } from "../../api/auth";
import ChangePasswordModal from "../auth/ChangePasswordModal";

const roleLabel: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  CASHIER: "Thu ngân",
  WAITER: "Phục vụ",
};
type DropdownName = "help" | "user" | null;

const menuRow =
  "flex items-center justify-between px-5 py-2 min-h-[3.6rem] text-md cursor-pointer text-ink transition-colors hover:bg-[var(--kv-state-hover-bg)]";

const ActionArea = () => {
  const [open, setOpen] = useState<DropdownName>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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
      signOut();
      setOpen(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2" ref={ref}>
        {/* ── Settings ── */}
        <div className="relative flex items-center">
          <button
            className="kv-btn kv-btn-icon-only kv-btn-outline-primary"
            onClick={() => {
              setOpen(null);
              navigate("/manager/settings");
            }}
            aria-label="Thiết lập"
          >
            <IconSettings size={16} />
          </button>
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

              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  navigate("/my-profile");
                }}
                className={`${menuRow} w-full bg-transparent border-none text-left`}
              >
                Hồ sơ của tôi
              </button>

              <div className="h-px bg-line my-1" />

              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  setShowChangePassword(true);
                }}
                className={`${menuRow} w-full bg-transparent border-none text-left`}
              >
                Đổi mật khẩu
              </button>

              <div className="h-px bg-line my-1" />

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
