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
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20 border border-brand-500/30',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-slate-200 dark:border-slate-700/50',
    danger: 'bg-status-danger hover:bg-red-600 text-white shadow-md shadow-status-danger/20 border border-red-500/30',
    success: 'bg-status-success hover:bg-emerald-600 text-white shadow-md shadow-status-success/20 border border-emerald-500/30',
    ghost: 'hover:bg-slate-100 dark:hover:bg-surface-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
    outline: 'border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent',
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
