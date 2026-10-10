import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading: React.FC<{ message?: string; className?: string }> = ({
  message = '加载中...',
  className = 'h-64',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
