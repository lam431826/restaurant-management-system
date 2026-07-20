import { useState, useEffect } from 'react';

export default function QuantityInput({ quantity, onChange, onRemove }) {
  const [inputValue, setInputValue] = useState(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const commitValue = () => {
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || val <= 0) {
      onRemove();
    } else {
      onChange(val);
      setInputValue(val.toString());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

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
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
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
