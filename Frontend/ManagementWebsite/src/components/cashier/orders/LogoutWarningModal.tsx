interface LogoutWarningModalProps {
  onCloseShiftAndLogout: () => void;
  onLogoutOnly: () => void;
  onCancel: () => void;
}

export const LogoutWarningModal = ({
  onCloseShiftAndLogout,
  onLogoutOnly,
  onCancel,
}: LogoutWarningModalProps) => (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}
  >
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden">
      <div className="px-6 py-5 border-b border-[#eceef0]">
        <h2 className="text-[18px] font-bold text-[#202325]">Đăng xuất</h2>
        <p className="text-[13px] text-[#636566] mt-1">
          Đăng xuất sẽ không đóng ca thu ngân của bạn. Ca vẫn mở trên hệ thống
          và sẽ được khôi phục khi bạn đăng nhập lại.
        </p>
      </div>
      <div className="p-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onCloseShiftAndLogout}
          className="h-11 rounded-lg bg-[#025cca] text-white font-semibold text-[15px] hover:bg-[#0251b3] transition-colors"
        >
          Đóng ca rồi đăng xuất
        </button>
        <button
          type="button"
          onClick={onLogoutOnly}
          className="h-11 rounded-lg border border-[#d1d5db] text-[14px] text-[#636566] hover:bg-[#f5f5f5] transition-colors"
        >
          Chỉ đăng xuất
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 text-[13px] text-[#636566] hover:text-[#202325] transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
);
