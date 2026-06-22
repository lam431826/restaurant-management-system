import { useState } from 'react'
import IMG_BG from '../assets/images/reservation-bg.jpg'
import { useInView } from '../hooks/useInView'

export default function ReservationSection() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', guests: '', date: '', time: '',
  })
  const [contentRef, contentIn] = useInView()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

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

              {/* Form */}
              <div className="flex flex-col gap-4 w-[600px] max-w-full">
                <Field placeholder="Họ Tên" value={form.name} onChange={set('name')} />
                <Field placeholder="Số Điện Thoại" type="tel" value={form.phone} onChange={set('phone')} />
                <Field placeholder="Email" type="email" value={form.email} onChange={set('email')} />
                <div className="flex gap-4">
                  <Field placeholder="Số Lượng Khách" type="number" min="1" value={form.guests} onChange={set('guests')} className="flex-1 min-w-0" />
                  <Field placeholder="Ngày" type="date" value={form.date} onChange={set('date')} className="flex-1 min-w-0" />
                  <Field placeholder="Giờ" type="time" value={form.time} onChange={set('time')} className="flex-1 min-w-0" />
                </div>
                <button
                  type="button"
                  className="bg-[#efe7d2] w-full px-6 py-4 rounded-lg text-[#0a0b0a] text-xs tracking-[1px] uppercase hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer"
                  style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.3 }}
                >
                  Đặt Trước
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ className = '', ...props }) {
  return (
    <input
      className={`bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.15)] px-6 py-4 rounded-[10px] text-[#efe7d2] text-base outline-none focus:border-[rgba(239,231,210,0.5)] transition-colors placeholder:text-[rgba(239,231,210,0.5)] w-full [color-scheme:dark] ${className}`}
      style={{ fontFamily: "'MJ Satoshi', sans-serif", lineHeight: 1.8 }}
      {...props}
    />
  )
}

