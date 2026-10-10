import React, { useState } from 'react';
import { Room } from '../../types';
import { LayoutGrid, Layers, Info, MapPin, Sparkles } from 'lucide-react';

interface FloorplanViewProps {
  rooms: Room[];
}

export const FloorplanView: React.FC<FloorplanViewProps> = ({ rooms }) => {
  const [selectedFloor, setSelectedFloor] = useState<string>('一楼');

  const floors = Array.from(new Set(rooms.map((r) => r.area))).filter(Boolean);
  if (floors.length === 0) floors.push('一楼', '二楼');

  return (
    <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-6 shadow-card space-y-6">
      {/* Header and floor switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2D4A] pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-400" />
            <span>2D 空间户型图交互引擎 (预留模块)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            未来支持导入家庭户型图，并在二维平面上进行空间设备可视化点控
          </p>
        </div>

        {/* Floor selector */}
        <div className="flex items-center gap-2 bg-[#0A0F1D] p-1 rounded-xl border border-[#1E2D4A]">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedFloor === floor
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Blueprint Visual Mock Canvas */}
      <div className="relative min-h-[380px] bg-[#0A0F1D] rounded-2xl border-2 border-dashed border-[#1E2D4A] p-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #3B82F6 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Simulated blueprint room zones */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl w-full opacity-60 pointer-events-none mb-6">
          {rooms.slice(0, 4).map((r, i) => (
            <div
              key={r.id || i}
              className="p-4 rounded-xl bg-[#131C31]/90 border border-blue-500/30 text-center flex flex-col items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200">{r.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">空间区域坐标待映射</span>
            </div>
          ))}
        </div>

        {/* Informational Callout */}
        <div className="relative z-10 max-w-lg text-center p-4 rounded-xl bg-[#131C31]/90 border border-blue-500/30 backdrop-blur-md shadow-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>阶段 4 扩展规划</span>
          </div>

          <h4 className="text-sm font-bold text-slate-100">二维户型平面图与灯光点控引擎</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            本模块已在架构层与 Room 实体建立空间坐标映射预留接口。下阶段将提供户型图导入工具，支持在建筑平面图上直接拖拽定位硬件实体并实时同步开关光晕。
          </p>
        </div>
      </div>
    </div>
  );
};
