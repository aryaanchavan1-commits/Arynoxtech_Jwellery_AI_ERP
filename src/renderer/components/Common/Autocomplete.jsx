import React, { useState, useRef, useEffect } from 'react';

export default function Autocomplete({ options = [], value, onChange, placeholder = 'Type or select...', className = '', style = {}, disabled = false, creatable = false }) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filtered, setFiltered] = useState(options);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const selected = options.find(o => o.value === value);
    setInputValue(selected ? selected.label : (value || ''));
  }, [value, options]);

  useEffect(() => {
    setFiltered(options.filter(o => o.label?.toLowerCase().includes(inputValue.toLowerCase())));
  }, [inputValue, options]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setShowDropdown(true);
    const match = options.find(o => o.label.toLowerCase() === val.toLowerCase());
    if (match) {
      onChange(match.value);
    } else {
      onChange(val);
    }
  };

  const handleSelect = (opt) => {
    setInputValue(opt.label);
    setShowDropdown(false);
    onChange(opt.value);
  };

  const handleBlur = () => {
    if (creatable && inputValue.trim()) {
      const match = options.find(o => o.label.toLowerCase() === inputValue.toLowerCase());
      if (!match) onChange(inputValue.trim());
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }} className={className}>
      <input
        type="text"
        className="form-input"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%' }}
      />
      {showDropdown && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#1e293b', border: '1px solid #334155', borderRadius: '0 0 8px 8px',
          maxHeight: 180, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {filtered.map(opt => (
            <div key={opt.value}
              onClick={() => handleSelect(opt)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: opt.value === value ? 'rgba(245,158,11,0.15)' : 'transparent',
                borderBottom: '1px solid #0f172a'
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.1)'}
              onMouseLeave={e => e.target.style.background = opt.value === value ? 'rgba(245,158,11,0.15)' : 'transparent'}
            >{opt.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export const METAL_OPTIONS = [
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Stone', label: 'Stone' },
  { value: 'Other', label: 'Other' },
];

export const PURITY_OPTIONS = [
  { value: '24K', label: '24K (999)' },
  { value: '22K', label: '22K (916)' },
  { value: '18K', label: '18K (750)' },
  { value: '14K', label: '14K (585)' },
  { value: '916', label: '916' },
  { value: '750', label: '750' },
  { value: '585', label: '585' },
  { value: '999', label: '999 Pure Silver' },
  { value: 'Other', label: 'Other' },
];

export const PAYMENT_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Card', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'RTGS', label: 'RTGS / NEFT' },
  { value: 'Mix', label: 'Mix' },
  { value: 'Exchange', label: 'Exchange' },
  { value: 'Credit', label: 'Credit' },
];

export const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'Staff', label: 'Staff' },
  { value: 'Salesman', label: 'Salesman' },
  { value: 'Karagir', label: 'Karagir' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
];
