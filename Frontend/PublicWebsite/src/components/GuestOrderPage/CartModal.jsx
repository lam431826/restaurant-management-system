import DraftTab from './DraftTab'
import SentTab from './SentTab'

export default function CartModal({
  setIsCartOpen,
  activeTab,
  setActiveTab,
  cart,
  statusData,
  getItemImage,
  handleRemoveSpecificCartItem,
  handleUpdateNote,
  handleUpdateCartItemQuantity,
  totalItems,
  totalPrice,
  isSubmitting,
  isEditing,
  handleSubmitOrder,
  handleStartEditing
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col animate-fade-in">
      <div className="bg-white border-b px-4 py-3 flex items-center shadow-sm sticky top-0 z-20 shrink-0">
        <button onClick={() => setIsCartOpen(false)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 ml-2">Giỏ hàng của bạn</h2>
      </div>
      
      <div className="flex bg-white shadow-sm z-10 sticky top-[53px] shrink-0">
        <button 
          onClick={() => setActiveTab('draft')} 
          className={`flex-1 py-3.5 font-bold text-[15px] transition-colors relative ${activeTab === 'draft' ? 'text-orange-500' : 'text-gray-500'}`}
        >
          Món chưa gửi {cart.length > 0 && `(${cart.length})`}
          {activeTab === 'draft' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('sent')} 
          className={`flex-1 py-3.5 font-bold text-[15px] transition-colors relative ${activeTab === 'sent' ? 'text-orange-500' : 'text-gray-500'}`}
        >
          Đã đặt {statusData?.items?.length > 0 && `(${statusData.items.length})`}
          {activeTab === 'sent' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'draft' ? (
          <DraftTab 
            cart={cart}
            getItemImage={getItemImage}
            handleRemoveSpecificCartItem={handleRemoveSpecificCartItem}
            handleUpdateNote={handleUpdateNote}
            handleUpdateCartItemQuantity={handleUpdateCartItemQuantity}
            totalItems={totalItems}
            totalPrice={totalPrice}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            handleSubmitOrder={handleSubmitOrder}
          />
        ) : (
          <SentTab 
            statusData={statusData}
            handleStartEditing={handleStartEditing}
            getItemImage={getItemImage}
          />
        )}
      </div>
    </div>
  )
}
