import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

const bgImage = '/images/bg-food.jpg'
const logoImage = '/images/logo.png'

// username phải khớp với tài khoản seeded trong backend (DataSeeder)
const EMPLOYEES = [
  { id: 1, name: 'Duy Tan',     username: 'username_cashier', shift: '04:00 PM - 12:00 PM' },
  { id: 2, name: 'Manh Tung',   username: 'username_waiter',  shift: '08:00 AM - 04:00 PM' },
  { id: 3, name: 'Quang Huy',   username: 'username_waiter',  shift: '08:00 AM - 04:00 PM' },
  { id: 4, name: 'Mai Chi',     username: 'username_cashier', shift: '04:00 PM - 12:00 PM' },
  { id: 5, name: 'Elisa Klein', username: 'username_cashier', shift: '04:00 PM - 12:00 PM' },
]

const PIN_LENGTH = 6
const NUMPAD = ['1','2','3','4','5','6','7','8','9','.','0','del']

const AVATAR_COLORS = ['#5B8FE8','#E87A5B','#48B87A','#E8A825','#9B5BE8']

function Avatar({ name, index }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('')
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-[13px] leading-none"
      style={{ width: 40, height: 40, backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
    >
      {initials}
    </div>
  )
}

function BackspaceIcon() {
  return (
    <svg className="w-6 h-6 text-[#202325]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M22 3H7L2 12l5 9h15a2 2 0 002-2V5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 9l-4 4m0-4l4 4" />
    </svg>
  )
}

export default function EmployeeLoginPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const [selected, setSelected] = useState(EMPLOYEES[0])
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleKey(key) {
    if (key === 'del') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (key === '.') return
    if (pin.length < PIN_LENGTH) { setPin(p => p + key); setError('') }
  }

  async function handleStartShift() {
    if (pin.length < PIN_LENGTH) return
    setError('')
    setLoading(true)
    try {
      const { data } = await login(selected.username, pin)
      if (data.requiresVerification) {
        // First-login — redirect to main login page for OTP flow
        navigate('/login')
        return
      }
      saveSession(data)
      navigate('/cashier', { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 401) setError('PIN không đúng. Vui lòng thử lại.')
      else if (status === 423) setError('Tài khoản đã bị khóa.')
      else setError('Đã có lỗi xảy ra, vui lòng thử lại.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left hero panel */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute bottom-0 left-0 right-0 h-[52%] bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute" style={{ left: 138, top: 102 }}>
          <p className="font-bitter-rose text-[#face8d]" style={{ fontSize: 160, lineHeight: 0.9 }}>
            The pure taste of
          </p>
          <p className="font-forum text-white uppercase" style={{ fontSize: 140, lineHeight: 1, letterSpacing: '3px' }}>
            Japan
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="bg-white flex flex-col items-center justify-between px-[72px] py-8 w-[520px] shrink-0 h-screen overflow-y-auto">

        {/* Logo */}
        <img src={logoImage} alt="Aleo Cafe & Resto" className="h-10 w-auto shrink-0" />

        {/* Title */}
        <h2 className="text-[28px] font-bold text-[#025cca] tracking-[-0.28px] leading-[1.5] text-center shrink-0">
          Employee Login
        </h2>

        {/* Shift Dropdown */}
        <div className="flex flex-col gap-2 items-center w-full shrink-0" ref={dropdownRef}>
          <p className="text-[14px] text-[#636566] leading-[1.5]">
            Choose your account to start your shift.
          </p>
          <div className="relative w-full">
            <button
              onClick={() => setOpen(o => !o)}
              className="bg-[#f5f5f5] flex items-center gap-3 px-5 py-[10px] rounded-[12px] w-full text-left"
            >
              <Avatar name={selected.name} index={EMPLOYEES.indexOf(selected)} />
              <div className="flex-1 flex flex-col gap-[2px] min-w-0">
                <span className="text-[16px] font-medium text-[#202325] leading-[1.5]">{selected.name}</span>
                <span className="text-[14px] text-[#636566] leading-[1.5]">{selected.shift}</span>
              </div>
              <svg
                className={`w-5 h-5 shrink-0 text-[#636566] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e5] rounded-[12px] shadow-lg z-10 overflow-hidden">
                {EMPLOYEES.map((emp, i) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelected(emp); setOpen(false); setPin(''); setError('') }}
                    className={`flex items-center gap-3 px-5 py-[10px] w-full text-left hover:bg-[#f5f5f5] transition-colors ${emp.id === selected.id ? 'bg-[#e8f0fd]' : ''}`}
                  >
                    <Avatar name={emp.name} index={i} />
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[16px] font-medium text-[#202325] leading-[1.5]">{emp.name}</span>
                      <span className="text-[14px] text-[#636566] leading-[1.5]">{emp.shift}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PIN Input + Numpad */}
        <div className="flex flex-col gap-6 items-center w-full shrink-0">
          <div className="flex flex-col gap-3 items-center">
            <p className="text-[14px] text-[#636566] leading-[1.5]">
              {pin.length > 0
                ? 'Please input your PIN to validate yourself.'
                : 'Enter your PIN to validate yourself.'}
            </p>
            <div className="flex gap-[14px]">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`h-[50px] w-[52px] rounded-[12px] flex items-center justify-center transition-colors ${
                    error ? 'bg-red-50 border border-red-200' : 'bg-[#f5f5f5]'
                  }`}
                >
                  {i < pin.length && <div className="w-3 h-3 rounded-full bg-[#202325]" />}
                </div>
              ))}
            </div>
            {error && <p className="text-[13px] text-red-500 leading-[1.5] text-center">{error}</p>}
          </div>

          {/* Numpad */}
          <div className="flex flex-col gap-5 w-full">
            {[NUMPAD.slice(0, 3), NUMPAD.slice(3, 6), NUMPAD.slice(6, 9), NUMPAD.slice(9, 12)].map((row, ri) => (
              <div key={ri} className="flex justify-between w-full">
                {row.map(key => (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    disabled={loading}
                    className={`h-[54px] w-[64px] flex items-center justify-center rounded-[8px] hover:bg-[#f5f5f5] active:scale-95 transition-all ${key === '.' ? 'opacity-30 pointer-events-none' : ''}`}
                  >
                    {key === 'del'
                      ? <BackspaceIcon />
                      : <span className={`text-[28px] leading-none text-[#202325] ${key === '.' ? 'font-normal' : 'font-medium'}`}>{key}</span>
                    }
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Start Shift button */}
        <button
          onClick={handleStartShift}
          disabled={pin.length < PIN_LENGTH || loading}
          className="bg-[#025cca] flex items-center justify-center h-[60px] rounded-[12px] w-full shrink-0 hover:bg-[#0250b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[16px] font-semibold text-white leading-[1.5]">
            {loading ? 'Đang xác thực...' : 'Start Shift'}
          </span>
        </button>
      </div>
    </div>
  )
}
