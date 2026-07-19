import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import AssistanceButton from '../AssistanceButton'
import imgMakiSpicyTuna from '../../assets/images/menu-maki-spicy-tuna.jpg'
import QuantityInput from './QuantityInput'
import CartModal from './CartModal'
import AlertModal from './AlertModal'

const GUEST_ORDER_ALREADY_INVOICED_MESSAGE =
  'Đơn hàng đã được lập hóa đơn nên không thể thêm hoặc sửa món.'

export default function GuestOrderPage() {
  const [searchParams] = useSearchParams()
  const tableToken = searchParams.get('token') || 'token-ban-01'
  
  const [tableInfo, setTableInfo] = useState({ id: '', name: 'Đang tải...' })
  const [menuData, setMenuData] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('draft') // 'draft' | 'sent'
  const [currentOrderId, setCurrentOrderId] = useState(null)
  const [statusData, setStatusData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)

  useEffect(() => {
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

  useEffect(() => {
    if (!currentOrderId) {
      setStatusData(null)
      return;
    }
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/guest/orders/${currentOrderId}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatusData(data)
        }
      } catch (err) {
        console.error("Failed to fetch order status", err)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [currentOrderId])

  const getMenuItem = (itemId) => {
    for (const cat of menuData) {
      const item = cat.items.find(i => i.id === itemId)
      if (item) return item
    }
    return null
  }

  const getItemImage = (itemId) => {
    const item = getMenuItem(itemId)
    return item?.imageUrl || imgMakiSpicyTuna
  }

  const getQuantity = (itemId) => {
    return cart.filter(i => i.id === itemId).reduce((sum, i) => sum + i.quantity, 0)
  }

  const handleSetMenuGridQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(i => i.id !== itemId))
      return;
    }
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.id === itemId)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = { ...next[existingIdx], quantity: newQuantity }
        return next
      }
      const item = getMenuItem(itemId)
      if (item) {
        return [...prev, { ...item, cartItemId: Date.now() + Math.random(), quantity: newQuantity, note: '' }]
      }
      return prev
    })
  }

  const handleUpdateCartItemQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(i => i.cartItemId !== cartItemId))
      return
    }
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: newQuantity } : i))
  }

  const handleRemoveSpecificCartItem = (cartItemId) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId))
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
      items: cart.map(item => ({
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentOrderId(data.orderId)
        setCart([])
        setIsEditing(false)
        setActiveTab('sent') // Switch to sent tab to see status
      } else {
        const text = await res.text()
        let message = 'Lỗi HTTP ' + res.status + ': ' + text
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
        setAlertMessage(message)
      }
    } catch (err) {
      console.error(err)
      setAlertMessage('Không thể kết nối máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEditing = () => {
    if (!statusData || !statusData.items) return
    const newCart = statusData.items.map((item, index) => ({
      cartItemId: `${Date.now()}-${index}`,
      id: item.menuItemId,
      name: item.menuItemName,
      price: item.unitPrice,
      note: item.note || '',
      quantity: item.quantity
    }))
    setCart(newCart)
    setIsEditing(true)
    setActiveTab('draft')
  }

  function scrollToCategory(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Removed common QuantityInput Component, imported from file

  return (
    <div className="bg-[#f5f5f5] min-h-screen font-sans pb-[40px]">
      {/* Header Mobile */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-800 m-0 leading-tight">{tableInfo.name}</h1>
          <p className="text-xs text-gray-500 m-0">Đang phục vụ</p>
        </div>
        <div className="flex items-center gap-4">
          <AssistanceButton tableToken={tableToken} />
          
          {/* Cart Icon */}
          <button onClick={() => setIsCartOpen(true)} className="relative p-1 text-gray-700 hover:text-orange-500 transition-colors">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {(totalItems > 0 || (statusData?.items?.length > 0 && !isEditing)) && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                {totalItems > 0 ? totalItems : statusData.items.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <p className="text-gray-500">Đang tải thực đơn...</p>
        </div>
      ) : (
        <>
          {/* Category Navigation (Horizontal scroll) */}
          <div className="bg-white border-b sticky top-[60px] z-10 overflow-x-auto hide-scrollbar whitespace-nowrap px-2 py-2 flex gap-2 shadow-sm">
            {menuData.map(cat => (
              <button
                key={cat.categoryId}
                onClick={() => scrollToCategory(`mob-cat-${cat.categoryId}`)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
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
                <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-gray-100">
                  {cat.items.map((item) => {
                    const q = getQuantity(item.id)
                    const imgUrl = item.imageUrl || imgMakiSpicyTuna
                    return (
                      <div key={item.id} className="p-3 flex gap-3">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                          <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 leading-tight">{item.name}</h3>
                            <p className="text-[13px] text-gray-500 mt-1 line-clamp-2 leading-snug">{item.description}</p>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-orange-500 font-bold">{item.price.toLocaleString('vi-VN')}đ</span>
                            
                            {/* Quantity Controls */}
                            {q > 0 ? (
                              <QuantityInput 
                                quantity={q} 
                                onChange={(val) => handleSetMenuGridQuantity(item.id, val)}
                                onRemove={() => handleSetMenuGridQuantity(item.id, 0)}
                              />
                            ) : (
                              <button 
                                onClick={() => handleSetMenuGridQuantity(item.id, 1)} 
                                className="bg-orange-50 text-orange-500 border border-orange-200 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-orange-100 transition-colors"
                              >
                                Thêm món
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {cat.items.length === 0 && (
                    <p className="p-5 text-center text-gray-400 text-sm italic">Không có món.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Full Screen Cart Modal */}
      {isCartOpen && (
        <CartModal
          setIsCartOpen={setIsCartOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cart={cart}
          statusData={statusData}
          getItemImage={getItemImage}
          handleRemoveSpecificCartItem={handleRemoveSpecificCartItem}
          handleUpdateNote={handleUpdateNote}
          handleUpdateCartItemQuantity={handleUpdateCartItemQuantity}
          totalItems={totalItems}
          totalPrice={totalPrice}
          isSubmitting={isSubmitting}
          isEditing={isEditing}
          handleSubmitOrder={handleSubmitOrder}
          handleStartEditing={handleStartEditing}
        />
      )}

      {/* Alert Modal */}
      <AlertModal message={alertMessage} onClose={() => setAlertMessage(null)} />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}
