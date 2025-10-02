import React from 'react';
import { Video as LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  trend: { value: number; isPositive: boolean };
  icon: LucideIcon;
  color: string;
}

export function MetricsCard({ title, value, trend, icon: Icon, color }: MetricsCardProps) {
  const colorMap = {
    'red': 'bg-red-500',
    'blue': 'bg-blue-500', 
    'purple': 'bg-purple-500',
    'orange': 'bg-orange-500',
    'green': 'bg-green-500',
    'pink': 'bg-pink-500'
  };

  const bgColor = colorMap[color as keyof typeof colorMap] || color;

  return (
    <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6 hover:border-crimson-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}/20`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}%
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
}