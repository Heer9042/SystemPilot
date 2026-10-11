import React from 'react';

export function ProcessTableHead({ columns }) {
  return (
    <thead>
      <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
        {columns.map((col) => (
          <th
            key={col.label || col.id}
            className={`py-1.5 font-medium ${
              col.align === 'right'
                ? 'text-right'
                : col.align === 'center'
                ? 'text-center'
                : ''
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
