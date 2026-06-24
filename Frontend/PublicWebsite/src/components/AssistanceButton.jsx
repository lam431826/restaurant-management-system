import { useState } from 'react'

const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export default function AssistanceButton({ tableToken }) {
  const [isOpen, setIsOpen] = useState(false)
  const [requestType, setRequestType] = useState('Lấy thêm khăn giấy')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // 'success' or 'error'

  const COMMON_REQUESTS = ['Lấy thêm khăn giấy', 'Xin thêm nước chấm', 'Dọn bàn', 'Thanh toán', 'Khác']

  const handleSendRequest = async () => {
    setLoading(true)
    setStatus(null)
    
    const finalNote = requestType === 'Khác' ? note : `${requestType}. ${note}`.trim()
    
    const body = {
      tableToken: tableToken,
      requestType: "GENERAL",
      message: finalNote || requestType
    }

    try {
      const res = await fetch('/api/guest/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to request assistance')
      setStatus('success')
      setTimeout(() => {
        setIsOpen(false)
        setStatus(null)
        setNote('')
      }, 2000)
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-orange-200 rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all shadow-sm shrink-0"
      >
        <BellIcon />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-[#0a0b0a] border border-[rgba(239,231,210,0.2)] rounded-2xl w-[90%] max-w-[400px] p-6 shadow-2xl animate-fade-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[#efe7d2] text-xl" style={{ fontFamily: 'Forum, serif' }}>Gọi Phục Vụ</h3>
              <button onClick={() => setIsOpen(false)} className="text-[#efe7d2] hover:text-white">
                <XIcon />
              </button>
            </div>

            {status === 'success' ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-[rgba(239,231,210,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <BellIcon className="text-[#efe7d2]" />
                </div>
                <p className="text-[#efe7d2] text-lg font-medium">Đã gửi yêu cầu!</p>
                <p className="text-[rgba(245,242,234,0.7)] text-sm mt-2">Nhân viên sẽ hỗ trợ bạn ngay.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[rgba(245,242,234,0.7)] text-sm">Bạn cần hỗ trợ gì?</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_REQUESTS.map(req => (
                      <button 
                        key={req}
                        onClick={() => setRequestType(req)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                          requestType === req 
                            ? 'bg-[#efe7d2] text-[#0a0b0a] border-[#efe7d2]' 
                            : 'bg-[rgba(24,24,24,0.5)] text-[#efe7d2] border-[rgba(239,231,210,0.2)] hover:border-[#efe7d2]'
                        }`}
                      >
                        {req}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[rgba(245,242,234,0.7)] text-sm">Chi tiết (Không bắt buộc)</label>
                  <textarea 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Nhập thêm chi tiết nếu cần..."
                    className="w-full bg-[rgba(24,24,24,0.5)] border border-[rgba(239,231,210,0.2)] rounded-lg p-3 text-[#efe7d2] outline-none focus:border-[#efe7d2] transition-colors resize-none h-24"
                  />
                </div>

                {status === 'error' && <p className="text-red-400 text-sm text-center">Có lỗi xảy ra. Vui lòng thử lại.</p>}

                <button 
                  onClick={handleSendRequest}
                  disabled={loading}
                  className="w-full bg-[#efe7d2] text-[#0a0b0a] py-3 rounded-xl font-bold uppercase tracking-wide hover:bg-white transition-colors mt-2 disabled:opacity-70"
                >
                  {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
