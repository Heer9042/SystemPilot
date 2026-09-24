import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function AreaChartLive({
  data = [],
  color = '#6366f1',
  unit = '%',
  height = 120,
  domain = [0, 100],
  title,
}) {
  const gradientId = `grad_${color.replace('#', '')}`;

  return (
    <div className="w-full flex flex-col">
      {title && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
          <span>{title}</span>
          {data.length > 0 && (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {data[data.length - 1]?.value} {unit}
            </span>
          )}
        </div>
      )}
      <div style={{ height: `${height}px` }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis domain={domain} hide />
            <XAxis dataKey="time" hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                borderColor: 'var(--tooltip-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--tooltip-text)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value) => [`${value} ${unit}`, 'Usage']}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
