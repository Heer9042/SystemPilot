import React from 'react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon: Icon,
  fullWidth = false,
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
    xl: 'text-lg px-6 py-3.5 gap-3 font-bold',
  };

  const variantStyles = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 border border-brand-500/30',
    secondary: 'bg-surface-800 hover:bg-surface-700 text-slate-200 border border-slate-700/50',
    danger: 'bg-status-danger/90 hover:bg-status-danger text-white shadow-lg shadow-status-danger/20 border border-red-500/30',
    success: 'bg-status-success/90 hover:bg-status-success text-white shadow-lg shadow-status-success/20 border border-emerald-500/30',
    ghost: 'hover:bg-surface-800 text-slate-300 hover:text-white',
    outline: 'border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-transparent',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : size === 'xl' ? 'w-6 h-6' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}
