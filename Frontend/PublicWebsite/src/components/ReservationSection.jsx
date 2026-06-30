import { useState } from 'react'
import IMG_BG from '../assets/images/reservation-bg.jpg'
import { useInView } from '../hooks/useInView'

const API_BASE = 'http://localhost:8080/api'

export default function ReservationSection() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', guests: '', date: '', time: '', note: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const [contentRef, contentIn] = useInView()

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    setServerError('')
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập họ tên'
    if (!form.phone.trim()) {
      e.phone = 'Vui lòng nhập số điện thoại'
    } else if (!/^0\d{9,10}$/.test(form.phone.trim())) {
      e.phone = 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 10–11 số)'
    }
    if (!form.guests || Number(form.guests) < 1 || Number(form.guests) > 20)
      e.guests = 'Số khách từ 1 đến 20'
    if (!form.date) {
      e.date = 'Vui lòng chọn ngày'
    } else {
      const chosen = new Date(`${form.date}T${form.time || '00:00'}:00`)
      if (chosen <= new Date()) e.date = 'Ngày/giờ phải là tương lai'
    }
    if (!form.time) e.time = 'Vui lòng chọn giờ'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setLoading(true)
    setServerError('')
    try {
      const body = {
        guestName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        partySize: Number(form.guests),
        datetime: `${form.date}T${form.time}:00`,
        note: form.note.trim() || null,
      }
      const res = await fetch(`${API_BASE}/online/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 201) {
        setSuccess(true)
      } else {
        const data = await res.json().catch(() => ({}))
        const fieldErrs = data.fieldErrors
        if (fieldErrs) {
          setErrors(fieldErrs)
        } else {
          setServerError(data.message || 'Có lỗi xảy ra, vui lòng thử lại.')
        }
      }
    } catch {
      setServerError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
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

        {/* Right — form + footer */}
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

              {success ? (
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="w-16 h-16 rounded-full bg-[rgba(239,231,210,0.1)] flex items-center justify-center">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#efe7d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-2 items-center text-center">
                    <p className="text-[#efe7d2] text-[24px]" style={{ fontFamily: 'Forum, serif' }}>
                      Đặt bàn thành công!
                    </p>
                    <p className="text-[rgba(239,231,210,0.7)] text-[15px]" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
                      Chúng tôi đã nhận yêu cầu của bạn. Nhân viên sẽ liên hệ xác nhận sớm nhất có thể.
                      {form.email && ' Kiểm tra email để biết thêm chi tiết.'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSuccess(false); setForm({ name: '', phone: '', email: '', guests: '', date: '', time: '', note: '' }) }}
                    className="border border-[rgba(239,231,210,0.3)] text-[#efe7d2] px-8 py-3 rounded-lg text-sm tracking-[1px] uppercase hover:bg-[rgba(239,231,210,0.08)] transition-colors cursor-pointer"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif" }}
                  >
                    Đặt bàn mới
                  </button>
                </div>
              ) : (
                /* Form */
                <div className="flex flex-col gap-4 w-[600px] max-w-full">
                  <div className="flex flex-col gap-1">
                    <Field placeholder="Họ Tên *" value={form.name} onChange={set('name')} hasError={!!errors.name} />
                    {errors.name && <ErrMsg>{errors.name}</ErrMsg>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Field placeholder="Số Điện Thoại *" type="tel" value={form.phone} onChange={set('phone')} hasError={!!errors.phone} />
                    {errors.phone && <ErrMsg>{errors.phone}</ErrMsg>}
                  </div>

                  <Field placeholder="Email (tuỳ chọn)" type="email" value={form.email} onChange={set('email')} />

                  <div className="flex gap-4">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <Field placeholder="Số Khách *" type="number" min="1" max="20" value={form.guests} onChange={set('guests')} className="w-full" hasError={!!errors.guests} />
                      {errors.guests && <ErrMsg>{errors.guests}</ErrMsg>}
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <Field placeholder="Ngày *" type="date" value={form.date} onChange={set('date')} className="w-full" hasError={!!errors.date} />
                      {errors.date && <ErrMsg>{errors.date}</ErrMsg>}
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <Field placeholder="Giờ *" type="time" value={form.time} onChange={set('time')} className="w-full" hasError={!!errors.time} />
                      {errors.time && <ErrMsg>{errors.time}</ErrMsg>}
                    </div>
                  </div>

                  <textarea
                    placeholder="Ghi chú (tuỳ chọn)"
                    value={form.note}
                    onChange={set('note')}
                    rows={3}
                    className="bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] px-6 py-4 rounded-[10px] text-[#efe7d2] text-base outline-none focus:border-[rgba(239,231,210,0.5)] transition-colors placeholder:text-[rgba(239,231,210,0.5)] resize-none"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.8 }}
                  />

                  {serverError && (
                    <p className="text-[#ff6b6b] text-sm text-center" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
                      {serverError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSubmit}
                    className="bg-[#efe7d2] w-full px-6 py-4 rounded-lg text-[#0a0b0a] text-xs tracking-[1px] uppercase hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer disabled:opacity-60"
                    style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                  >
                    {loading ? 'Đang gửi...' : 'Đặt Trước'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ className = '', hasError = false, ...props }) {
  return (
    <input
      className={`bg-[rgba(24,24,24,0.5)] border px-6 py-4 rounded-[10px] text-[#efe7d2] text-base outline-none focus:border-[rgba(239,231,210,0.5)] transition-colors placeholder:text-[rgba(239,231,210,0.5)] w-full [color-scheme:dark] ${hasError ? 'border-[#ff6b6b]' : 'border-[rgba(239,231,210,0.15)]'} ${className}`}
      style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.8 }}
      {...props}
    />
  )
}

function ErrMsg({ children }) {
  return (
    <p className="text-[#ff6b6b] text-xs pl-2" style={{ fontFamily: "'MJ Satoshi', sans-serif" }}>
      {children}
    </p>
  )
}
