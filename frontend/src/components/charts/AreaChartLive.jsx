import React, { lazy, Suspense } from 'react';

const DEFAULT_DATA = [];
const DEFAULT_DOMAIN = [0, 100];

const RechartsArea = lazy(() =>
  import('recharts').then((m) => ({
    default: ({ data, color, gradientId, domain, unit }) => (
      <m.ResponsiveContainer width="100%" height="100%">
        <m.AreaChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <m.YAxis domain={domain} hide />
          <m.XAxis dataKey="time" hide />
          <m.Tooltip
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
          <m.Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </m.AreaChart>
      </m.ResponsiveContainer>
    ),
  }))
);

export function AreaChartLive({
  data = DEFAULT_DATA,
  color = '#6366f1',
  unit = '%',
  height = 120,
  domain = DEFAULT_DOMAIN,
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
        <Suspense fallback={<div className="w-full h-full bg-slate-100/50 dark:bg-surface-800/30 rounded animate-pulse" />}>
          <RechartsArea
            data={data}
            color={color}
            gradientId={gradientId}
            domain={domain}
            unit={unit}
          />
        </Suspense>
      </div>
    </div>
  );
}
