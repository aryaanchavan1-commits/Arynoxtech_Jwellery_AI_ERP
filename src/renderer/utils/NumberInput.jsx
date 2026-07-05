import React from 'react';

export default function NumberInput({ value, onChange, min, max, step = 'any', style = {}, className = '', placeholder = '', disabled = false }) {
  const displayValue = value === '' || value === '.' || value === null || value === undefined ? '' : String(value);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '' || raw === '.' || raw === '-' || raw === '-.') {
      onChange(raw);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`form-input ${className}`}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder || (step === 'any' ? '0' : '0')}
      disabled={disabled}
      style={{ ...style }}
    />
  );
}
