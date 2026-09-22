import React from 'react';

export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 transition-all duration-200 ${
        hover ? 'glass-panel-interactive cursor-pointer' : 'glass-panel'
      } ${className}`}
    >
      {children}
    </div>
  );
}
