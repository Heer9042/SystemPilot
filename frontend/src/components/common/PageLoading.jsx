import React from 'react';

export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3 animate-fadeIn">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-500 dark:border-brand-400 border-t-transparent animate-spin" />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
        Loading module...
      </span>
    </div>
  );
}

export default PageLoading;
