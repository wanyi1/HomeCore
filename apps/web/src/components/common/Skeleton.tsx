import React from 'react';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-5 animate-pulse space-y-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D2B4A]" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 bg-[#1D2B4A] rounded" />
                <div className="h-3 w-16 bg-[#1D2B4A]/60 rounded" />
              </div>
            </div>
            <div className="h-6 w-16 bg-[#1D2B4A] rounded-full" />
          </div>

          <div className="h-14 bg-[#0A0F1D]/80 rounded-xl border border-[#1E2D4A]/50" />

          <div className="pt-3 border-t border-[#1E2D4A] flex justify-between items-center">
            <div className="h-3 w-20 bg-[#1D2B4A] rounded" />
            <div className="h-7 w-20 bg-[#1D2B4A] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
