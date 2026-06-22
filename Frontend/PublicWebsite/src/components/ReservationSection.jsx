import { useState } from 'react'
import IMG_BG from '../assets/images/reservation-bg.jpg'
import { useInView } from '../hooks/useInView'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ tên'
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại'
  else if (!/^0\d{9,10}$/.test(form.phone.trim())) errors.phone = 'Bắt đầu bằng 0, 10–11 chữ số'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email không hợp lệ'
  if (!form.guests) errors.guests = 'Nhập số khách'
  else if (parseInt(form.guests) < 1 || parseInt(form.guests) > 20) errors.guests = 'Từ 1–20 khách'
  if (!form.date) errors.date = 'Chọn ngày'
  if (!form.time) errors.time = 'Chọn giờ'
  if (form.date && form.time) {
    const dt = new Date(`${form.date}T${form.time}:00`)
    if (dt.getTime() - Date.now() < 31 * 60 * 1000) {
      errors.time = 'Phải đặt trước ít nhất 30 phút'
    }
  }
  return errors
}

function fmtDatetime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Field component ───────────────────────────────────────────────────────────

function Field({ className = '', error, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <input
        className={`bg-[rgba(24,24,24,0.5)] border px-6 py-4 rounded-[10px] text-[#efe7d2] text-base outline-none transition-colors placeholder:text-[rgba(239,231,210,0.5)] w-full [color-scheme:dark] ${
          error
            ? 'border-red-400/60'
            : 'border-[rgba(239,231,210,0.15)] focus:border-[rgba(239,231,210,0.5)]'
        }`}
        style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.8 }}
        {...props}
      />
      {error && (
        <p className="text-red-400/80 text-[11px] pl-2" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ── Success Panel ─────────────────────────────────────────────────────────────

function SuccessPanel({ reservation, onReset }) {
  return (
    <div className="flex flex-col items-center gap-8 w-[600px] max-w-full text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full border border-[rgba(239,231,210,0.25)] bg-[rgba(239,231,210,0.06)] flex items-center justify-center text-[#efe7d2]">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-3">
        <p
          className="text-[#efe7d2] text-[28px] uppercase tracking-[1px]"
          style={{ fontFamily: 'Forum, serif', lineHeight: 1.3 }}
        >
          Đặt Bàn Thành Công
        </p>
        <p
          className="text-[rgba(239,231,210,0.55)] text-[15px] leading-[1.7]"
          style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
        >
          Yêu cầu của bạn đã được ghi nhận. Nhân viên sẽ liên hệ qua điện thoại để xác nhận trong thời gian sớm nhất.
        </p>
      </div>

      {/* Reservation detail card */}
      <div className="bg-[rgba(24,24,24,0.6)] border border-[rgba(239,231,210,0.1)] rounded-[14px] p-6 w-full flex flex-col gap-[14px] text-left">
        <InfoRow label="Họ tên" value={reservation.guestName} />
        <InfoRow label="Điện thoại" value={reservation.phone} />
        {reservation.guestEmail && <InfoRow label="Email" value={reservation.guestEmail} />}
        <InfoRow label="Thời gian" value={fmtDatetime(reservation.datetime)} />
        <InfoRow label="Số khách" value={`${reservation.partySize} người`} />
        {reservation.note && <InfoRow label="Ghi chú" value={reservation.note} />}
        <div className="border-t border-[rgba(239,231,210,0.08)] pt-3">
          <InfoRow label="Mã đặt bàn" value={reservation.id?.slice(0, 8).toUpperCase()} mono />
        </div>
      </div>

      <button
        onClick={onReset}
        className="border border-[rgba(239,231,210,0.2)] bg-[rgba(239,231,210,0.05)] w-full px-6 py-4 rounded-lg text-[#efe7d2] text-xs tracking-[1px] uppercase hover:bg-[rgba(239,231,210,0.12)] transition-colors"
        style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
      >
        Đặt Bàn Khác
      </button>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span
        className="text-[rgba(239,231,210,0.45)] text-[13px] shrink-0 pt-px"
        style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
      >
        {label}
      </span>
      <span
        className={`text-[#efe7d2] text-[13px] text-right leading-[1.5] ${mono ? 'font-mono tracking-widest' : ''}`}
        style={mono ? undefined : { fontFamily: "'MJ Satoshi', sans-serif" }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', phone: '', email: '', guests: '', date: '', time: '', note: '' }

export default function ReservationSection() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(null)
  const [contentRef, contentIn] = useInView()

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError('')
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const body = {
        guestName: form.name.trim(),
        phone: form.phone.trim(),
        partySize: parseInt(form.guests),
        datetime: `${form.date}T${form.time}:00`,
      }
      if (form.email.trim()) body.email = form.email.trim()
      if (form.note.trim()) body.note = form.note.trim()

      const res = await fetch('/api/online/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setApiError(json.message || 'Đặt bàn thất bại. Vui lòng thử lại.')
        return
      }
      setSuccess(json.data)
    } catch {
      setApiError('Không thể kết nối máy chủ. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSuccess(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setApiError('')
  }

  return (
    <section id="reservation" className="bg-[#0a0b0a] p-6">
      <div className="flex gap-4 items-start">

        {/* Left — sticky image */}
        <div className="flex-1 sticky top-6 self-start h-[calc(100vh-3rem)] overflow-hidden rounded-2xl relative bg-black min-w-0">
          <img
            src={IMG_BG}
            alt="Wine glasses at Wasabi"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-b from-transparent to-black opacity-60 pointer-events-none" />
          <p
            className="absolute bottom-[140px] left-[77px] text-[#efe7d2] uppercase tracking-[2px] leading-none"
            style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(36px, 5vw, 112px)' }}
          >
            Reservation
          </p>
        </div>

        {/* Right — form / success */}
        <div ref={contentRef} className={`flex-1 flex flex-col gap-4 min-w-0 ${contentIn ? 'animate-fade-up' : 'opacity-0'}`}>
          <div className="border border-[rgba(239,231,210,0.15)] rounded-2xl flex flex-col items-center justify-center px-24 py-20">
            <div className="flex flex-col gap-20 items-center w-full">

              {/* Heading */}
              <div className="flex flex-col gap-4 items-center w-full">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center size-[11.3px]">
                      <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                    </div>
                    <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
                  </div>
                  <p
                    className="text-[#efe7d2] text-[40px] tracking-[1px] uppercase whitespace-nowrap"
                    style={{ fontFamily: 'Forum, serif', lineHeight: 1.2 }}
                  >
                    ĐĂT Bàn
                  </p>
                  <div className="flex items-center">
                    <div className="bg-[rgba(239,231,210,0.15)] h-px w-[50px]" />
                    <div className="flex items-center justify-center size-[11.3px]">
                      <div className="-rotate-45 border border-[rgba(239,231,210,0.15)] size-2" />
                    </div>
                  </div>
                </div>
                <p
                  className="text-[#efe7d2] text-[18px] text-center leading-[1.5] max-w-[534px]"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
                >
                  Hãy nhanh tay đặt chỗ tại Wasabi, nơi bạn sẽ được thưởng thức sushi hảo hạng và trải nghiệm ẩm thực tuyệt vời.
                </p>
              </div>

              {/* Form or Success */}
              {success ? (
                <SuccessPanel reservation={success} onReset={handleReset} />
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-[600px] max-w-full" noValidate>
                  <Field
                    placeholder="Họ Tên *"
                    value={form.name}
                    onChange={set('name')}
                    error={errors.name}
                  />
                  <Field
                    placeholder="Số Điện Thoại *"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    error={errors.phone}
                  />
                  <Field
                    placeholder="Email (nhận xác nhận qua email)"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    error={errors.email}
                  />
                  <div className="flex gap-4 items-start">
                    <Field
                      placeholder="Số Khách *"
                      type="number"
                      min="1"
                      max="20"
                      value={form.guests}
                      onChange={set('guests')}
                      className="flex-1 min-w-0"
                      error={errors.guests}
                    />
                    <Field
                      type="date"
                      min={todayStr()}
                      value={form.date}
                      onChange={set('date')}
                      className="flex-1 min-w-0"
                      error={errors.date}
                    />
                    <Field
                      type="time"
                      value={form.time}
                      onChange={set('time')}
                      className="flex-1 min-w-0"
                      error={errors.time}
                    />
                  </div>
                  <textarea
                    placeholder="Ghi chú (yêu cầu đặc biệt, dị ứng thực phẩm...)"
                    value={form.note}
                    onChange={set('note')}
                    rows={3}
                    className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] px-6 py-4 rounded-[10px] text-[#efe7d2] text-base outline-none focus:border-[rgba(239,231,210,0.5)] transition-colors placeholder:text-[rgba(239,231,210,0.5)] w-full resize-none"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.8 }}
                  />

                  {apiError && (
                    <p
                      className="text-red-400/80 text-[13px] text-center"
                      style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
                    >
                      {apiError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#efe7d2] w-full px-6 py-4 rounded-lg text-[#0a0b0a] text-xs tracking-[1px] uppercase hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                  >
                    {loading ? 'Đang gửi...' : 'Đặt Trước'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
