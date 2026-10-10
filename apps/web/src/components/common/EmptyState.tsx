import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-card rounded-card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto border border-[#1E2D4A] ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4 shadow-glowBlue">
        <Icon className="w-8 h-8" />
      </div>

      <h3 className="text-base font-bold text-slate-100 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded-btn bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-blue-600/25 active:scale-95"
            >
              {actionText}
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 rounded-btn bg-[#1A253E] hover:bg-[#223152] border border-[#26375A] text-slate-300 text-xs sm:text-sm font-medium transition active:scale-95"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
