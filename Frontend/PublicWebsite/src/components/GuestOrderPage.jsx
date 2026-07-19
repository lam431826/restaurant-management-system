import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import AssistanceButton from './AssistanceButton'
import OrderStatusModal from './OrderStatusModal'
import imgMakiSpicyTuna from '../assets/images/menu-maki-spicy-tuna.jpg'
import { getImageUrl } from '../utils/api'
import { createGuestClient } from '../services/realtimeClient'

const GUEST_ORDER_ALREADY_INVOICED_MESSAGE =
  'Đơn hàng đã được lập hóa đơn nên không thể thêm hoặc sửa món.'

export default function GuestOrderPage() {
  const [searchParams] = useSearchParams()
  // FE-PUB-02 fix: this silently fell back to a hardcoded, non-existent table token when
  // ?token= was missing from the URL, routing an unrecognized guest onto a real table
  // without any warning. No fallback now — a missing token renders an explicit error state.
  const tableToken = searchParams.get('token')

  const [tableInfo, setTableInfo] = useState({ id: '', name: 'Đang tải...' })
  const [menuData, setMenuData] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState(null)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Guest STOMP connection, scoped to this table session (table-token auth, no login).
  // Kept in a ref so OrderStatusModal can subscribe without triggering re-renders here.
  const realtimeRef = useRef(null)
  useEffect(() => {
    if (!tableToken) return
    const rt = createGuestClient(tableToken)
    realtimeRef.current = rt
    return () => rt.disconnect()
  }, [tableToken])

  useEffect(() => {
    if (!tableToken) return

    // Fetch Table Info
    fetch(`/api/guest/orders/table-info?token=${tableToken}`)
      .then(res => res.json())
      .then(data => {
        setTableInfo({ id: data.tableId, name: data.tableName })
        if (data.activeOrderId) {
          setCurrentOrderId(data.activeOrderId)
        }
      })
      .catch(err => {
        console.error('Failed to fetch table info:', err)
        setTableInfo({ id: 'T01', name: 'Bàn T01' }) // Fallback
      })

    // Fetch Menu
    fetch('/api/menu/public')
      .then(res => res.json())
      .then(data => {
        setMenuData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch menu:', err)
        setLoading(false)
      })
  }, [tableToken])

  // Get quantity of an item in cart (for new items only, not original/editing)
  const getQuantity = (itemId) => {
    const found = cart.find(i => i.id === itemId && !i.isOriginal)
    return found ? found.quantity : 0
  }

  const handleAddToCart = (item) => {
    // Group by item ID — increment quantity if already in cart
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && !i.isOriginal)
      if (existing) {
        return prev.map(i =>
          i.id === item.id && !i.isOriginal
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...item, cartItemId: Date.now() + Math.random(), quantity: 1, note: '' }]
    })
  }

  const handleRemoveFromCart = (itemId) => {
    // Decrement quantity; remove entry if quantity reaches 0
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId && !i.isOriginal)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter(i => !(i.id === itemId && !i.isOriginal))
      }
      return prev.map(i =>
        i.id === itemId && !i.isOriginal
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
    })
  }

  const handleRemoveSpecificCartItem = (cartItemId) => {
    // Decrement quantity; remove entry if quantity reaches 0
    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter(i => i.cartItemId !== cartItemId)
      }
      return prev.map(i =>
        i.cartItemId === cartItemId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
    })
  }

  const handleUpdateNote = (cartItemId, text) => {
    setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, note: text } : item))
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    
    const payload = {
      tableToken: tableToken,
      items: cart.filter(item => !item.isOriginal || item.cookingStatus === 'PENDING').map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        note: item.note || ''
      }))
    }

    try {
      let url = '/api/guest/orders';
      let method = 'POST';

      if (isEditing) {
        url = `/api/guest/orders/${currentOrderId}/items`;
        method = 'PUT';
      } else if (currentOrderId) {
        url = `/api/guest/orders/${currentOrderId}/items`;
        method = 'POST'; // Append items
      }
      
      const res = await fetch(url, {
        method: method,
        // X-Table-Token required on /items endpoints (BE-TBL-02) — proves this guest
        // actually holds the table the order belongs to, not just a guessed orderId.
        headers: { 'Content-Type': 'application/json', 'X-Table-Token': tableToken },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentOrderId(data.orderId)
        setCart([])
        setIsCartOpen(false)
        setIsStatusOpen(true)
        setIsEditing(false)
      } else {
        const text = await res.text()
        let message = 'Loi HTTP ' + res.status + ': ' + text
        try {
          const body = JSON.parse(text)
          if (
            body.error === 'ORDER_ALREADY_INVOICED' ||
            body.message?.includes('Order already has an invoice')
          ) {
            message = GUEST_ORDER_ALREADY_INVOICED_MESSAGE
          }
        } catch {
          if (text.includes('ORDER_ALREADY_INVOICED')) {
            message = GUEST_ORDER_ALREADY_INVOICED_MESSAGE
          }
        }
        alert(message)
      }
    } catch (err) {
      console.error(err)
      alert('Khong the ket noi may chu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditOrder = (statusData) => {
    // Load items back to cart
    if (statusData && statusData.items) {
      const newCart = statusData.items.map((item, index) => ({
        cartItemId: `${Date.now()}-${index}`,
        id: item.menuItemId,
        name: item.menuItemName,
        price: item.unitPrice,
        note: item.note || '',
        image: '/images/food-item.jpg', // Placeholder
        cookingStatus: item.cookingStatus,
        quantity: item.quantity,
        isOriginal: true
      }))
      setCart(newCart)
      setIsEditing(true)
      setIsCartOpen(true)
    }
  }

  function scrollToCategory(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!tableToken) {
    return (
      <div className="bg-[#f5f5f5] min-h-screen font-sans flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-gray-800 mb-2">Liên kết không hợp lệ</p>
          <p className="text-sm text-gray-500">
            Không tìm thấy mã bàn. Vui lòng quét lại mã QR trên bàn để đặt món.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen font-sans pb-[100px]">
      {/* Header Mobile */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-800 m-0 leading-tight">{tableInfo.name}</h1>
          <p className="text-xs text-gray-500 m-0">Đang phục vụ</p>
        </div>
        <div className="flex items-center gap-2">
          <AssistanceButton tableToken={tableToken} />
          {currentOrderId && (
            <button 
              onClick={() => setIsStatusOpen(true)}
              className="text-orange-500 font-semibold text-sm border border-orange-500 px-3 py-1.5 rounded-md"
            >
              Đơn của bạn
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <p className="text-gray-500">Đang tải thực đơn...</p>
        </div>
      ) : (
        <>
          {/* Category Navigation (Horizontal scroll) */}
          <div className="bg-white border-b sticky top-[60px] z-10 overflow-x-auto hide-scrollbar whitespace-nowrap px-2 py-2 flex gap-2">
            {menuData.map(cat => (
              <button
                key={cat.categoryId}
                onClick={() => scrollToCategory(`mob-cat-${cat.categoryId}`)}
                className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
              >
                {cat.categoryName}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          <div className="px-3 pt-4 flex flex-col gap-6">
            {menuData.map(cat => (
              <div key={cat.categoryId} id={`mob-cat-${cat.categoryId}`}>
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-1">{cat.categoryName}</h2>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col divide-y">
                  {cat.items.map((item) => {
                    const q = getQuantity(item.id)
                    const imgUrl = getImageUrl(item.imageUrl) || imgMakiSpicyTuna
                    return (
                      <div key={item.id} className="p-3 flex gap-3">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                          <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = imgMakiSpicyTuna }} />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-medium text-gray-900 leading-tight line-clamp-2">{item.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-orange-500 font-bold">{item.price.toLocaleString('vi-VN')}đ</span>
                            
                            {/* Quantity Controls */}
                            {q > 0 ? (
                              <div className="flex items-center gap-3 bg-gray-50 px-2 py-1 rounded-full border">
                                <button onClick={() => handleRemoveFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold text-lg">-</button>
                                <span className="text-sm font-bold w-4 text-center">{q}</span>
                                <button onClick={() => handleAddToCart(item)} className="w-6 h-6 flex items-center justify-center text-orange-500 font-bold text-lg">+</button>
                              </div>
                            ) : (
                              <button onClick={() => handleAddToCart(item)} className="bg-orange-50 text-orange-500 border border-orange-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xl pb-1">
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {cat.items.length === 0 && (
                    <p className="p-4 text-center text-gray-400 text-sm italic">Không có món.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}


      {/* Bottom Cart Bar */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-0 inset-x-0 p-4 z-30 pointer-events-none">
          <div 
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto bg-orange-500 text-white rounded-xl p-3 px-4 shadow-lg flex justify-between items-center cursor-pointer transform transition-transform active:scale-95"
          >
            <div className="flex flex-col">
              <span className="text-xs opacity-90">{totalItems} món</span>
              <span className="font-bold text-lg">{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              Xem Giỏ Hàng
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="border-b px-4 py-3 flex items-center gap-3 sticky top-0 bg-white shadow-sm z-10">
            <button onClick={() => setIsCartOpen(false)} className="p-2 -ml-2 text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-bold">Giỏ hàng của bạn</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-20">
            {cart.map((item, index) => (
              <div key={item.cartItemId} className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100 relative">
                {(!item.isOriginal || item.cookingStatus === 'PENDING') && (
                  <button 
                    onClick={() => handleRemoveSpecificCartItem(item.cartItemId)}
                    className="absolute top-3 right-3 text-red-400 p-1 hover:bg-red-50 rounded-full"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                <div className="flex justify-between mb-3 pr-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{index + 1}. {item.name}</h3>
                      {item.quantity > 1 && !item.isOriginal && (
                        <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">x{item.quantity}</span>
                      )}
                    </div>
                    {item.isOriginal && item.cookingStatus !== 'PENDING' && (
                      <span className="text-xs text-blue-500 font-semibold bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {item.cookingStatus === 'COOKING' ? 'Đang nấu' : item.cookingStatus === 'READY' ? 'Nấu xong' : item.cookingStatus === 'SERVED' ? 'Đã phục vụ' : item.cookingStatus === 'REJECTED' ? 'Đã hủy' : ''}
                      </span>
                    )}
                    <p className="text-orange-500 font-semibold text-sm mt-1">
                      {item.quantity > 1
                        ? <>{(item.price * item.quantity).toLocaleString('vi-VN')}đ <span className="text-gray-400 font-normal">({item.price.toLocaleString('vi-VN')}đ x{item.quantity})</span></>
                        : <>{item.price.toLocaleString('vi-VN')}đ</>}
                    </p>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Ghi chú (VD: Ít đá, không cay...)"
                  className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                  value={item.note || ''}
                  onChange={(e) => handleUpdateNote(item.cartItemId, e.target.value)}
                  disabled={item.isOriginal && item.cookingStatus !== 'PENDING'}
                />
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-10 text-gray-400">Giỏ hàng đang trống.</div>
            )}
          </div>

          <div className="bg-white border-t p-4 pb-6 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] relative z-20">
            <div className="flex justify-between mb-4">
              <span className="font-semibold text-gray-600">Tổng cộng:</span>
              <span className="font-bold text-xl text-orange-500">{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <button 
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-orange-500 text-white font-bold text-lg py-3 rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi Thu ngân'}
            </button>
          </div>
        </div>
      )}

      {isStatusOpen && (
        <OrderStatusModal
          orderId={currentOrderId}
          tableToken={tableToken}
          onClose={() => setIsStatusOpen(false)}
          onEditOrder={handleEditOrder}
          onOrderFinished={() => setCurrentOrderId(null)}
          subscribeRealtime={(destination, onMessage) => realtimeRef.current?.subscribe(destination, onMessage)}
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
