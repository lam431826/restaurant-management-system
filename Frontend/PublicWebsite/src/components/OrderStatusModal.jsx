import { useState, useEffect } from 'react'

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function OrderStatusModal({ orderId, onClose, onEditOrder, onOrderFinished }) {
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/guest/orders/${orderId}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatusData(data)
        }
      } catch (err) {
        console.error("Failed to fetch order status", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Poll every 15 seconds
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [orderId])

  if (!orderId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0b0a] border border-[rgba(239,231,210,0.2)] rounded-2xl w-[90%] max-w-[450px] overflow-hidden shadow-2xl animate-fade-up">
        
        {/* Header */}
        <div className="bg-[rgba(239,231,210,0.05)] p-6 border-b border-[rgba(239,231,210,0.15)] flex justify-between items-center">
          <div>
            <h3 className="text-[#efe7d2] text-2xl" style={{ fontFamily: 'Forum, serif' }}>Trạng Thái Đơn Hàng</h3>
            <p className="text-[rgba(245,242,234,0.6)] text-sm">Mã đơn: #{orderId}</p>
          </div>
          <button onClick={onClose} className="text-[rgba(245,242,234,0.7)] hover:text-[#efe7d2] transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          {loading && !statusData ? (
            <p className="text-[rgba(245,242,234,0.7)]">Đang tải thông tin...</p>
          ) : statusData ? (
            <div className="flex flex-col items-center gap-6 w-full">
              
              {/* Status Icon & Text */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                statusData.status === 'PENDING' ? 'bg-[#ffedd5] text-[#f97316]' :
                statusData.status === 'ACCEPTED' ? 'bg-[#dcf7ea] text-[#286b4a]' :
                statusData.status === 'CANCELLED' ? 'bg-[#fee2e2] text-[#ef4444]' :
                'bg-[#e0e7ff] text-[#4f46e5]'
              }`}>
                {statusData.status === 'PENDING' ? <ClockIcon /> : <CheckIcon />}
              </div>

              <div>
                <h4 className="text-[#efe7d2] text-xl font-bold mb-2">
                  {statusData.status === 'PENDING' ? 'Đang Chờ Duyệt' :
                   statusData.status === 'ACCEPTED' ? 'Đã Tiếp Nhận & Đang Nấu' :
                   statusData.status === 'READY' ? 'Đã Nấu Xong' :
                   statusData.status === 'SERVED' ? 'Đã Phục Vụ' :
                   statusData.status === 'CANCELLED' ? 'Đã Hủy' : statusData.status}
                </h4>
                
                {statusData.status === 'PENDING' && (
                  <p className="text-[rgba(245,242,234,0.7)] text-sm">
                    Nhà bếp đang tiếp nhận đơn hàng của bạn. Vui lòng đợi trong giây lát.
                  </p>
                )}
                {statusData.status === 'ACCEPTED' && (
                  <p className="text-[rgba(245,242,234,0.7)] text-sm">
                    Món ăn của bạn đang được bếp trưởng chuẩn bị. Thời gian dự kiến: <span className="text-[#efe7d2] font-semibold">{statusData.estimatedWaitTimeMinutes} phút</span>.
                  </p>
                )}
              </div>

              {/* Progress Bar for visual appeal */}
              {(statusData.status === 'PENDING' || statusData.status === 'ACCEPTED') && (
                <div className="w-full bg-[rgba(24,24,24,0.8)] h-2 rounded-full overflow-hidden mt-4">
                  <div 
                    className="h-full bg-[#efe7d2] transition-all duration-1000 ease-in-out" 
                    style={{ width: statusData.status === 'PENDING' ? '30%' : '70%' }}
                  />
                </div>
              )}

              {/* Items List */}
              {statusData.items && statusData.items.length > 0 && (
                <div className="w-full mt-2 flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(239,231,210,0.3) transparent' }}>
                  <div className="h-px bg-[rgba(239,231,210,0.15)] w-full mb-1" />
                  {statusData.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[rgba(239,231,210,0.05)] p-3 rounded-xl border border-[rgba(239,231,210,0.1)]">
                      <div className="flex flex-col text-left">
                        <span className="text-[#efe7d2] font-semibold">{item.menuItemName} <span className="text-[rgba(245,242,234,0.7)] font-normal text-sm ml-1">x{item.quantity}</span></span>
                        {item.note && <span className="text-[rgba(245,242,234,0.5)] text-xs mt-1">Ghi chú: {item.note}</span>}
                        {item.rejectionNote && <span className="text-[#ef4444] text-xs mt-1">Lý do hủy: {item.rejectionNote}</span>}
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          item.cookingStatus === 'PENDING' ? 'bg-[#ffedd5] text-[#f97316]' :
                          item.cookingStatus === 'COOKING' ? 'bg-[#dbeafe] text-[#2563eb]' :
                          item.cookingStatus === 'READY' ? 'bg-[#dcf7ea] text-[#286b4a]' :
                          item.cookingStatus === 'SERVED' ? 'bg-[#e0e7ff] text-[#4f46e5]' :
                          'bg-[#fee2e2] text-[#ef4444]'
                        }`}>
                          {item.cookingStatus === 'PENDING' ? 'Chờ duyệt' :
                           item.cookingStatus === 'COOKING' ? 'Đang nấu' : 
                           item.cookingStatus === 'READY' ? 'Nấu xong' : 
                           item.cookingStatus === 'SERVED' ? 'Đã phục vụ' : item.cookingStatus === 'REJECTED' ? 'Đã hủy' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-400">Không tìm thấy thông tin đơn hàng.</p>
          )}

          <div className="w-full mt-8 flex gap-3">
            {statusData?.status === 'PENDING' && onEditOrder && (
              <button 
                onClick={() => {
                  onEditOrder(statusData)
                  onClose()
                }}
                className="flex-1 bg-[#efe7d2] text-[#0a0b0a] font-semibold py-3 rounded-xl hover:bg-white transition-colors"
              >
                Sửa đơn hàng
              </button>
            )}
            <button 
              onClick={() => {
                onClose();
                if (statusData && (statusData.status === 'CLOSED' || statusData.status === 'CANCELLED')) {
                  if (onOrderFinished) onOrderFinished();
                }
              }}
              className="flex-1 bg-[rgba(24,24,24,0.8)] border border-[rgba(239,231,210,0.3)] text-[#efe7d2] py-3 rounded-xl hover:bg-[rgba(239,231,210,0.1)] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
