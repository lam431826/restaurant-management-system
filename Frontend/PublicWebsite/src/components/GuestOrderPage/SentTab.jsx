export default function SentTab({ statusData, handleStartEditing, getItemImage }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 pb-8">
      {statusData && (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-1">Trạng thái đơn</p>
            <h3 className={`font-bold text-lg ${statusData.status === 'PENDING' ? 'text-orange-500' : 'text-green-600'}`}>
              {statusData.status === 'PENDING' ? 'Đang Chờ Duyệt' :
               statusData.status === 'ACCEPTED' ? 'Đã Tiếp Nhận' :
               statusData.status === 'READY' ? 'Nấu Xong' :
               statusData.status === 'SERVED' ? 'Đã Phục Vụ' :
               statusData.status === 'CANCELLED' ? 'Đã Hủy' : statusData.status}
            </h3>
            {statusData.status === 'ACCEPTED' && (
              <p className="text-xs text-gray-600 mt-1">Dự kiến: <span className="font-bold text-gray-900">{statusData.estimatedWaitTimeMinutes} phút</span></p>
            )}
          </div>
          {statusData.status === 'PENDING' && (
            <button 
              onClick={handleStartEditing} 
              className="bg-orange-50 text-orange-600 border border-orange-200 font-bold py-1.5 px-4 rounded-xl text-sm hover:bg-orange-100 transition-colors shadow-sm"
            >
              Sửa đơn
            </button>
          )}
        </div>
      )}
      
      {(!statusData || !statusData.items || statusData.items.length === 0) ? (
        <div className="flex flex-col items-center justify-center pt-10 text-gray-400">
          <p className="text-sm font-medium">Đơn hàng của bạn chưa có món nào.</p>
        </div>
      ) : (
        statusData.items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-3 mb-3 shadow-sm border border-gray-100 flex gap-3 relative opacity-95">
            <img src={getItemImage(item.menuItemId)} className="w-16 h-16 rounded-xl object-cover grayscale-[20%] border border-gray-100" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-800 text-sm leading-tight pr-1">
                  {item.menuItemName} 
                  <span className="text-gray-500 font-medium ml-1">x{item.quantity}</span>
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ml-2 ${
                  item.cookingStatus === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                  item.cookingStatus === 'COOKING' ? 'bg-blue-100 text-blue-600' :
                  item.cookingStatus === 'READY' ? 'bg-green-100 text-green-700' :
                  item.cookingStatus === 'SERVED' ? 'bg-indigo-100 text-indigo-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {item.cookingStatus === 'PENDING' ? 'Chờ duyệt' :
                   item.cookingStatus === 'COOKING' ? 'Đang nấu' : 
                   item.cookingStatus === 'READY' ? 'Nấu xong' : 
                   item.cookingStatus === 'SERVED' ? 'Đã phục vụ' : 
                   item.cookingStatus === 'REJECTED' ? 'Đã hủy' : item.cookingStatus}
                </span>
              </div>
              <p className="text-gray-700 font-semibold text-[13px] mt-1">{(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</p>
              {item.note && <p className="text-gray-500 text-[11px] mt-1.5 bg-gray-50 px-2 py-1 rounded-md inline-block">Ghi chú: {item.note}</p>}
              {item.rejectionNote && <p className="text-red-600 text-[11px] mt-1.5 bg-red-50 px-2 py-1 rounded-md font-medium inline-block border border-red-100">Lý do hủy: {item.rejectionNote}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
