import React, { useState, useEffect } from 'react';

interface ChartDataPoint {
  time: number;
  value: number;
}

interface SystemChartProps {
  title: string;
  data: ChartDataPoint[];
  color: string;
  type?: 'line' | 'area';
  suffix?: string;
}

export function SystemChart({ title, data, color, type = 'area', suffix = '' }: SystemChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>(data);

  useEffect(() => {
    setChartData(data);
  }, [data]);

  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  const points = chartData.map((item, index) => {
    const x = (index / (chartData.length - 1)) * 100;
    const y = 100 - (item.value / maxValue) * 100;
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points.split(' ').map(point => {
    const [x, y] = point.split(',');
    return `${x} ${y}`;
  }).join(' L ')}`;

  const areaPath = type === 'area' 
    ? `${pathData} L 100 100 L 0 100 Z`
    : pathData;

  const colorMap = {
    'red': '#ef4444',
    'blue': '#3b82f6',
    'purple': '#8b5cf6',
    'orange': '#f97316',
    'green': '#22c55e',
    'pink': '#ec4899'
  };

  const chartColor = colorMap[color as keyof typeof colorMap] || color;

  return (
    <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6 hover:border-crimson-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-sm text-gray-400">
          Last 24h
        </div>
      </div>
      <div className="h-32 relative">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="absolute inset-0"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s+/g, '-').toLowerCase()}`} x1="0%\" y1="0%\" x2="0%\" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={chartColor} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          {type === 'area' && (
            <path
              d={areaPath}
              fill={`url(#gradient-${title.replace(/\s+/g, '-').toLowerCase()})`}
              className="transition-all duration-300"
            />
          )}
          <path
            d={pathData}
            fill="none"
            stroke={chartColor}
            strokeWidth="2"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute bottom-2 right-2 bg-dark-800/80 px-2 py-1 rounded text-xs text-gray-300">
          {chartData[chartData.length - 1]?.value.toFixed(1)}{suffix}
        </div>
      </div>
    </div>
  );
}