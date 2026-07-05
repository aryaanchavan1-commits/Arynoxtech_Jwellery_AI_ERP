import React, { useState, useRef, useEffect, useCallback } from 'react';

const styles = {
  wrapper: { position: 'relative' },
  input: { width: '100%' },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    background: '#1e293b', border: '1px solid #334155', borderRadius: '0 0 8px 8px',
    maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
  },
  option: (isSelected) => ({
    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
    background: isSelected ? 'rgba(245,158,11,0.15)' : 'transparent',
    borderBottom: '1px solid #0f172a'
  }),
  createBtn: {
    padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#f59e0b',
    borderTop: '1px solid #334155', background: 'rgba(245,158,11,0.05)'
  },
};

export default function Autocomplete({
  options = [], value, onChange, placeholder = 'Type or select...',
  className = '', style = {}, disabled = false, creatable = false
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = useCallback(() => {
    if (!value && value !== 0) return '';
    const match = options.find(o => o.value === value);
    return match ? match.label : String(value);
  }, [value, options]);

  useEffect(() => {
    const label = selectedLabel();
    if (!focused) setText(label);
  }, [selectedLabel, focused]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    o.label?.toLowerCase().includes(text.toLowerCase())
  );

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    setOpen(true);
    if (!val) onChange('');
  };

  const handleSelect = (opt) => {
    setText(opt.label);
    setOpen(false);
    onChange(opt.value);
  };

  const handleBlur = () => {
    setFocused(false);
    if (creatable && text.trim()) {
      const match = options.find(o => o.label.toLowerCase() === text.toLowerCase());
      if (!match) onChange(text.trim());
    }
    if (!text && !creatable) onChange('');
  };

  const handleFocus = () => {
    setFocused(true);
    setText('');
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter') {
      if (filtered.length > 0) {
        handleSelect(filtered[0]);
      } else if (creatable && text.trim()) {
        handleBlur();
      }
      e.preventDefault();
    }
  };

  return (
    <div ref={wrapperRef} style={{ ...styles.wrapper, ...style }} className={className}>
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        value={text}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={styles.input}
      />
      {open && (
        <div style={styles.dropdown}>
          {filtered.map(opt => (
            <div key={opt.value}
              style={styles.option(opt.value === value)}
              onMouseDown={() => handleSelect(opt)}
              onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.1)'}
              onMouseLeave={e => e.target.style.background = opt.value === value ? 'rgba(245,158,11,0.15)' : 'transparent'}
            >{opt.label}</div>
          ))}
          {filtered.length === 0 && text.trim() && !creatable && (
            <div style={{ padding: '12px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>No matches found</div>
          )}
          {filtered.length === 0 && text.trim() && creatable && (
            <div style={styles.createBtn} onMouseDown={() => { onChange(text.trim()); setText(text.trim()); setOpen(false); }}>
              + Add "{text.trim()}"
            </div>
          )}
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
  { value: 'KDM', label: 'KDM' },
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
