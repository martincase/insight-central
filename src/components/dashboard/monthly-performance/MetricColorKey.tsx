import React from 'react';
import { Badge } from '@/components/ui/badge';

export const MetricColorKey: React.FC = () => {
  const metrics = [
    { label: 'Ad Spend', color: 'bg-orange-400', textColor: 'text-orange-600' },
    { label: 'Ad Sales', color: 'bg-green-500', textColor: 'text-green-700' },
    { label: 'ACoS', color: 'bg-red-400', textColor: 'text-red-600' },
    { label: 'Total Sales', color: 'bg-blue-500', textColor: 'text-blue-700' }
  ];

  return (
    <div className="flex items-center gap-4 p-3 bg-accent border-b border-border">
      <span className="text-sm font-medium text-foreground">Metrics:</span>
      <div className="flex items-center gap-3 flex-wrap">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${metric.color}`} />
            <span className={`text-xs font-medium ${metric.textColor}`}>
              {metric.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};