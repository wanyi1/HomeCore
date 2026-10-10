import React from 'react';
import { Sparkles, Wifi, WifiOff, Cpu } from 'lucide-react';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'online' | 'offline' | 'demo' | 'physical' | 'primary' | 'warning' | 'info' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'subtle',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  switch (variant) {
    case 'online':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-beacon" />
          {children || '在线'}
        </span>
      );

    case 'offline':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {children || '未连接'}
        </span>
      );

    case 'demo':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 ${sizeClasses} ${className}`}
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          {children || '演示沙箱'}
        </span>
      );

    case 'physical':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30 ${sizeClasses} ${className}`}
        >
          <Cpu className="w-3 h-3 text-blue-400" />
          {children || '物理硬件'}
        </span>
      );

    case 'warning':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 ${sizeClasses} ${className}`}
        >
          {children}
        </span>
      );

    case 'info':
    case 'primary':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses} ${className}`}
        >
          {children}
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium bg-[#1A253E] text-slate-300 border border-[#26375A] ${sizeClasses} ${className}`}
        >
          {children}
        </span>
      );
  }
};
