import React from 'react';
import { motion } from 'framer-motion';

interface KeypadProps {
  value: string;
  onChange: (val: string) => void;
  onEnter: () => void;
  maxValue?: number;
}

export function Keypad({ value, onChange, onEnter, maxValue }: KeypadProps) {
  const handleKeyClick = (key: string) => {
    if (key === 'BACK') {
      onChange(value.slice(0, -1));
    } else if (key === 'MAX' && maxValue !== undefined) {
      onChange(maxValue.toString());
    } else if (key === 'ENTER') {
      onEnter();
    } else {
      // Prevent leading zeros unless it's just "0"
      if (value === '0' && key !== '0' && key !== '00' && key !== '000') {
        onChange(key);
      } else if (value === '0' && (key === '0' || key === '00' || key === '000')) {
        return; // do nothing
      } else {
        // Prevent extremely large numbers arbitrarily (e.g. max 15 digits)
        if (value.length < 12) {
          onChange(value + key);
        }
      }
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '20px',
    fontWeight: 700,
    background: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    touchAction: 'manipulation', // Prevent double-tap zoom on iOS
    userSelect: 'none'
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '0', '00', '000'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {keys.map(k => (
          <motion.button
            key={k}
            whileTap={{ scale: 0.95, background: 'var(--border-color)' }}
            style={buttonStyle}
            onClick={() => handleKeyClick(k)}
          >
            {k}
          </motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          style={{ ...buttonStyle, flex: 1, background: 'var(--panel-bg)', color: 'var(--danger)' }}
          onClick={() => handleKeyClick('BACK')}
        >
          ⌫ 지우기
        </motion.button>
        {maxValue !== undefined && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            style={{ ...buttonStyle, flex: 1, background: 'var(--panel-bg)', color: 'var(--primary)' }}
            onClick={() => handleKeyClick('MAX')}
          >
            💰 올인
          </motion.button>
        )}
      </div>
    </div>
  );
}
