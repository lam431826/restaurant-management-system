export default function QuantityInput({ quantity, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 px-1 py-1 rounded-full border border-gray-200">
      <button 
        onClick={() => quantity > 1 ? onChange(quantity - 1) : onRemove()} 
        className="w-7 h-7 flex items-center justify-center text-gray-600 font-bold text-lg hover:bg-gray-200 rounded-full transition-colors"
      >
        -
      </button>
      <input 
        type="number" 
        value={quantity === 0 ? '' : quantity} 
        onChange={(e) => {
          const val = parseInt(e.target.value, 10)
          if (!isNaN(val)) onChange(val)
          else if (e.target.value === '') onRemove()
        }}
        className="w-8 text-center bg-transparent font-bold text-sm outline-none m-0 p-0 hide-arrows"
        style={{ appearance: 'textfield' }}
      />
      <button 
        onClick={() => onChange(quantity + 1)} 
        className="w-7 h-7 flex items-center justify-center text-orange-500 font-bold text-lg hover:bg-orange-100 rounded-full transition-colors"
      >
        +
      </button>
    </div>
  );
}
