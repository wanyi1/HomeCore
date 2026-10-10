import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'demo' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'muted', size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  const variantClasses = {
    primary: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    demo: 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-medium',
    muted: 'bg-slate-800 text-slate-300 border border-slate-700',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-sans tracking-wide ${sizeClasses} ${variantClasses}`}>
      {children}
    </span>
  );
};
