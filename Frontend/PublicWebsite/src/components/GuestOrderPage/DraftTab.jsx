import QuantityInput from './QuantityInput'

export default function DraftTab({
  cart,
  getItemImage,
  handleRemoveSpecificCartItem,
  handleUpdateNote,
  handleUpdateCartItemQuantity,
  totalItems,
  totalPrice,
  isSubmitting,
  isEditing,
  handleSubmitOrder
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-base font-medium">Giỏ hàng chưa có món nào.</p>
            <p className="text-sm mt-1">Hãy quay lại thực đơn để chọn món nhé.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.cartItemId} className="bg-white rounded-2xl p-3 mb-3 shadow-sm border border-gray-100 flex gap-3">
              <img src={getItemImage(item.id)} alt={item.name} className="w-20 h-20 rounded-xl object-cover border border-gray-100" />
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 text-sm pr-2 leading-tight">{item.name}</h3>
                  <button onClick={() => handleRemoveSpecificCartItem(item.cartItemId)} className="text-red-400 p-1.5 -m-1.5 hover:bg-red-50 rounded-full transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <p className="text-orange-500 font-bold text-sm mt-1">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                <div className="flex justify-between items-center mt-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Ghi chú (Tùy chọn)..."
                    className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-shadow"
                    value={item.note || ''}
                    onChange={(e) => handleUpdateNote(item.cartItemId, e.target.value)}
                  />
                  <QuantityInput 
                    quantity={item.quantity} 
                    onChange={(q) => handleUpdateCartItemQuantity(item.cartItemId, q)}
                    onRemove={() => handleRemoveSpecificCartItem(item.cartItemId)}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border-t p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.08)] relative z-20 shrink-0">
        <div className="flex justify-between mb-3 items-end">
          <span className="font-semibold text-gray-500 text-[13px]">Tổng cộng ({totalItems} món)</span>
          <span className="font-bold text-xl text-orange-500 leading-none">{totalPrice.toLocaleString('vi-VN')}đ</span>
        </div>
        <button 
          onClick={handleSubmitOrder}
          disabled={isSubmitting || cart.length === 0}
          className="w-full bg-orange-500 text-white font-bold text-[15px] py-3.5 rounded-xl disabled:opacity-50 disabled:bg-gray-300 hover:bg-orange-600 transition-colors shadow-sm"
        >
          {isSubmitting ? 'Đang gửi...' : (isEditing ? 'Lưu thay đổi' : 'Gửi Thu ngân')}
        </button>
      </div>
    </div>
  );
}
