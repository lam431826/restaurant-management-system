import { useState } from 'react'

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
)

const NoteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
)

export default function CartSidebar({ isOpen, onClose, cart, updateQuantity, updateNote, tableId, onSubmitOrder, isSubmitting }) {

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[#0a0b0a] border-l border-[rgba(239,231,210,0.15)] z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[rgba(239,231,210,0.15)] shrink-0">
          <h2 className="text-[#efe7d2] text-2xl tracking-[1px] uppercase" style={{ fontFamily: 'Forum, serif' }}>Giỏ Hàng</h2>
          <button onClick={onClose} className="text-[#efe7d2] hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {cart.length === 0 ? (
            <p className="text-[rgba(245,242,234,0.7)] text-center mt-10">Giỏ hàng của bạn đang trống.</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 items-start border-b border-dashed border-[rgba(239,231,210,0.15)] pb-6">
                <div className="w-[80px] h-[80px] rounded-lg overflow-hidden shrink-0 bg-black">
                  <img src={item.imageUrl || '../assets/images/menu-maki-spicy-tuna.jpg'} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <p className="text-[#efe7d2] font-semibold">{item.name}</p>
                    <p className="text-[#efe7d2] text-sm shrink-0 whitespace-nowrap ml-2">{(item.price * item.quantity).toLocaleString('vi-VN')}Đ</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-[rgba(24,24,24,0.5)] w-fit rounded-lg p-1 border border-[rgba(239,231,210,0.15)]">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-[#efe7d2] hover:bg-[rgba(239,231,210,0.1)] rounded"><MinusIcon /></button>
                    <span className="text-[#efe7d2] w-4 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-[#efe7d2] hover:bg-[rgba(239,231,210,0.1)] rounded"><PlusIcon /></button>
                  </div>
                  
                  <div className="mt-1 relative">
                    <div className="flex items-center gap-1 text-[rgba(245,242,234,0.5)] text-xs mb-1">
                      <NoteIcon /> Ghi chú
                    </div>
                    <input 
                      type="text" 
                      value={item.note || ''}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                      placeholder="Không hành, ít cay..." 
                      className="w-full bg-transparent border-b border-[rgba(239,231,210,0.2)] text-[#efe7d2] text-sm py-1 outline-none focus:border-[#efe7d2] transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[rgba(239,231,210,0.15)] shrink-0 bg-[rgba(10,11,10,0.95)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#efe7d2] text-lg">Tổng cộng</span>
              <span className="text-[#efe7d2] text-2xl font-bold" style={{ fontFamily: 'Forum, serif' }}>{total.toLocaleString('vi-VN')}Đ</span>
            </div>
            {/* error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p> */}
            <button 
              onClick={onSubmitOrder}
              disabled={isSubmitting}
              className="w-full bg-[#efe7d2] text-[#0a0b0a] py-4 rounded-xl font-bold tracking-wide uppercase hover:bg-white transition-colors disabled:opacity-70"
            >
              {isSubmitting ? 'Đang gửi...' : 'Chốt Order'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
