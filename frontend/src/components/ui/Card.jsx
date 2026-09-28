import React from 'react';

export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`rounded-xl p-4 transition-colors duration-200 ${
        hover ? 'glass-panel-interactive cursor-pointer' : 'glass-panel'
      } ${className}`}
    >
      {children}
    </div>
  );
}
