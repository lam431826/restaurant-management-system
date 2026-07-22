import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { AssistanceRequest } from "../../../services/orderApi";
import type { ShiftSummary } from "../../../services/shiftService";
import { SearchIcon, BellIcon, ChevronDownIcon, SwitchScreenIcon, LogoutIcon } from "./icons";

/* ─── Header ─────────────────────────────────────────────────────────────── */
export const Header = ({
  employeeName = "Duy Tan",
  roleLabel = "Thu ngân",
  role,
  shift,
  assistanceRequests = [],
  onResolveRequest,
  onLogout,
  onChangePassword,
  onCashMovement,
  onCloseShift,
}: {
  employeeName?: string;
  roleLabel?: string;
  role?: string;
  shift?: ShiftSummary | null;
  assistanceRequests?: AssistanceRequest[];
  onResolveRequest?: (id: string) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onCashMovement?: () => void;
  onCloseShift?: () => void;
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellCount = assistanceRequests.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setIsBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = employeeName
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-white flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-[#e8e8e8] z-[50]">
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/images/wasabi-logo.svg"
          alt="Wasabi"
          className="h-12 w-auto"
        />
      </div>

      <div className="flex items-center gap-3 bg-[#f5f5f5] rounded-[12px] px-4 h-[44px] w-[180px] md:w-[260px] lg:w-[340px]">
        <SearchIcon className="w-5 h-5 text-[#797b7c] shrink-0" />
        <input
          placeholder="Tìm Kiếm"
          className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none"
        />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="relative" ref={bellRef}>
          <button
            className="text-[#202325] relative p-2"
            onClick={() => setIsBellOpen((v) => !v)}
          >
            <BellIcon />
            {bellCount > 0 && (
              <span className="absolute top-0 right-0 bg-[#025cca] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {bellCount}
              </span>
            )}
          </button>

          {isBellOpen && (
            <div className="absolute top-[120%] right-0 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-[9999]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h6 className="text-lg font-bold text-gray-800 m-0">Yêu cầu gọi phục vụ</h6>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{bellCount} tin mới</span>
              </div>

              <div className="flex flex-col overflow-y-auto max-h-[400px] p-2 bg-white rounded-b-xl">
                {bellCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <span className="text-gray-400 mt-2 font-medium">Không có yêu cầu nào.</span>
                  </div>
                ) : (
                  assistanceRequests.map((req) => {
                    const tableNum = req.tableName || (req.tableId ? `Bàn ${req.tableId.substring(0, 4)}` : "Bàn ?");
                    return (
                      <div key={req.id} className="flex flex-col gap-2 p-3 mb-2 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">{tableNum}</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {req.createdAt ? new Date(req.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium ml-1">{req.message}</p>
                        <button
                          onClick={() => onResolveRequest?.(req.id)}
                          className="mt-1 bg-white border border-gray-300 text-gray-700 text-sm font-semibold py-1.5 px-4 rounded-lg hover:bg-gray-50 transition-colors self-end shadow-sm"
                        >
                          Đã Xử Lý ✓
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2"
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
              className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
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
                      setOpen(false);
                      navigate("/manager/dashboard");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <SwitchScreenIcon />
                    Màn Quản lý
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/waiter");
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <SwitchScreenIcon />
                    Màn Phục vụ
                  </button>
                  <div className="h-px bg-[#e8e8e8] mx-2" />
                </>
              )}
              {shift && (
                <>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onCashMovement?.();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                      />
                    </svg>
                    Thu / Chi quỹ
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onCloseShift?.();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                      />
                    </svg>
                    Đóng ca
                  </button>
                  <div className="h-px bg-[#e8e8e8] mx-2" />
                </>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/my-schedule");
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
              >
                <SwitchScreenIcon />
                Lịch làm việc
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/my-profile");
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
              >
                <SwitchScreenIcon />
                Hồ sơ của tôi
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => {
                  setOpen(false);
                  onChangePassword?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-[#202325] hover:bg-[#f5f5f5] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                Đổi mật khẩu
              </button>
              <div className="h-px bg-[#e8e8e8] mx-2" />
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-[14px] text-red-500 hover:bg-red-50 transition-colors"
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
