import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { login, verifyInfo, verifyOtp, resendOtp } from "../../api/auth";
import { useAuth, type UserRole } from "../../context/AuthContext";

/* ── icons ── */
const PersonIcon = () => (
  <svg
    className="w-6 h-6 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);
const LockIcon = () => (
  <svg
    className="w-6 h-6 shrink-0"
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
);
const EyeIcon = () => (
  <svg
    className="w-6 h-6 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const EyeOffIcon = () => (
  <svg
    className="w-6 h-6 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

/* ── shared input ── */
interface FieldProps {
  label: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const InputField = ({
  label,
  icon,
  rightIcon,
  placeholder,
  type = "text",
  value,
  onChange,
}: FieldProps) => (
  <div className="flex flex-col gap-3">
    <label className="text-[14px] font-semibold text-[#202325] leading-[1.5]">
      {label}
    </label>
    <div className="bg-[#f5f5f5] flex gap-3 h-[44px] items-center px-4 rounded-[12px] w-full">
      <span className="text-[#797b7c]">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-[14px] text-[#202325] placeholder-[#797b7c] outline-none leading-[1.5]"
      />
      {rightIcon && <span className="text-[#797b7c]">{rightIcon}</span>}
    </div>
  </div>
);

/* ── route helper ── */
function defaultRoute(role: UserRole): string {
  if (role === "ADMIN") return "/admin";
  if (role === "MANAGER") return "/manager/dashboard";
  if (role === "CASHIER") return "/cashier";
  return "/waiter";
}

type Step = "login" | "send-otp" | "enter-otp";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg =
    (location.state as { message?: string } | null)?.message ?? "";
  const { saveSession } = useAuth();

  const [step, setStep] = useState<Step>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  /* step 1: username + password */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      const data = res.data;
      if (data.requiresVerification) {
        setVerifyToken(data.verifyToken);
        setStep("send-otp");
      } else {
        saveSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        navigate(defaultRoute(data.user.role), { replace: true });
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      else if (status === 423)
        setError("Tài khoản đang bị khóa. Vui lòng liên hệ quản lý.");
      else setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /* step 2: send OTP to email */
  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await verifyInfo(verifyToken);
      setMaskedEmail(res.data.data.maskedEmail);
      setStep("enter-otp");
    } catch {
      setError("Không thể gửi OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /* step 3: verify OTP */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await verifyOtp(verifyToken, otp);
      const data = res.data;
      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate(defaultRoute(data.user.role), { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400) setError("Mã OTP không đúng.");
      else if (status === 429)
        setError("Đã nhập sai OTP quá nhiều lần. Tài khoản bị khóa OTP.");
      else setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  /* resend OTP */
  const handleResend = async () => {
    setResendMsg("");
    setError("");
    try {
      await resendOtp(verifyToken);
      setResendMsg("Đã gửi lại OTP.");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429)
        setError("Đã đạt giới hạn gửi lại OTP (3 lần / 10 phút).");
      else setError("Không thể gửi lại OTP.");
    }
  };

  /* ── render ── */
  if (step === "login") {
    return (
      <AuthLayout title="Welcome Back" subtitle="Đăng nhập để bắt đầu làm việc">
        <form onSubmit={handleLogin} className="flex flex-col gap-[10px]">
          {successMsg && (
            <p className="text-[13px] text-green-600 bg-green-50 border border-green-200 rounded-[8px] px-3 py-2 leading-[1.5]">
              {successMsg}
            </p>
          )}
          <InputField
            label="Username"
            icon={<PersonIcon />}
            placeholder="Nhập tài khoản"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <InputField
            label="Password"
            icon={<LockIcon />}
            placeholder="Nhập mật khẩu"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[#797b7c] hover:text-[#202325]"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />
          {error && (
            <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[20px] font-semibold text-white leading-[1.5]">
              {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
            </span>
          </button>
        </form>
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={() => navigate("/employee-login")}
            className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline"
          >
            Đăng nhập nhân viên (PIN)
          </button>
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === "send-otp") {
    return (
      <AuthLayout
        title="Xác thực tài khoản"
        subtitle="Đây là lần đầu bạn đăng nhập. Vui lòng xác thực email."
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#636566] leading-[1.5]">
            Chúng tôi sẽ gửi mã OTP đến email đã đăng ký của bạn để kích hoạt
            tài khoản.
          </p>
          {error && (
            <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>
          )}
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[20px] font-semibold text-white leading-[1.5]">
              {loading ? "Đang gửi..." : "Gửi OTP qua Email"}
            </span>
          </button>
          <button
            onClick={() => setStep("login")}
            className="text-[14px] text-[#636566] hover:underline text-center"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </AuthLayout>
    );
  }

  /* step === 'enter-otp' */
  return (
    <AuthLayout
      title="Nhập mã OTP"
      subtitle={`Mã OTP đã được gửi đến ${maskedEmail}`}
    >
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-[10px]">
        <InputField
          label="Mã OTP (6 chữ số)"
          icon={<LockIcon />}
          placeholder="Nhập mã OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />
        {error && (
          <p className="text-[13px] text-red-500 leading-[1.5]">{error}</p>
        )}
        {resendMsg && (
          <p className="text-[13px] text-green-600 leading-[1.5]">
            {resendMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full mt-1 hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[20px] font-semibold text-white leading-[1.5]">
            {loading ? "Đang xác nhận..." : "Xác Nhận"}
          </span>
        </button>
      </form>
      <button
        onClick={handleResend}
        className="text-[14px] text-[#357dd5] leading-[1.5] hover:underline text-center"
      >
        Gửi lại OTP
      </button>
    </AuthLayout>
  );
};

export default LoginPage;
