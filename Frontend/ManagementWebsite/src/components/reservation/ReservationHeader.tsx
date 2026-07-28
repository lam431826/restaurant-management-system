import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { ReservationDto } from "../../api/reservations";
import {
  ChevronDownIcon,
  SwitchScreenIcon,
  LogoutIcon,
} from "../cashier/orders/icons";

type Tab = "calendar" | "list";

interface Props {
  onLogout?: () => void;
  onChangePassword?: () => void;
  bellOpen?: boolean;
  onBellToggle?: () => void;
  newReservations?: ReservationDto[];
  onOpenReservation?: (dto: ReservationDto) => void;
  employeeName?: string;
  roleLabel?: string;
}

const ReservationHeader = ({
  onLogout,
  onChangePassword,
  bellOpen = false,
  onBellToggle,
  newReservations = [],
  onOpenReservation,
  employeeName = "Nhân viên",
  roleLabel = "Phục vụ",
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

  const alertCount = newReservations.length;

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
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/my-schedule");
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors text-left"
              >
                <SwitchScreenIcon />
                Lịch làm việc
              </button>
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
