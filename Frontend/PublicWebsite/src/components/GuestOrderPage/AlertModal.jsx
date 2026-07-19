export default function AlertModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Thông báo</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <button 
          onClick={onClose} 
          className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
