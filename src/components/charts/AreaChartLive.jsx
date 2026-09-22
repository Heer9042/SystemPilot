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
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
          <span>{title}</span>
          {data.length > 0 && (
            <span className="font-semibold text-slate-200">
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
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(value) => [`${value} ${unit}`, 'Usage']}
              labelStyle={{ color: '#94a3b8' }}
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
