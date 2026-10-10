import React, { useState } from 'react';
import { Room, Device } from '../../types';
import { Badge } from '../common/Badge';
import {
  Grid,
  Edit2,
  Trash2,
  Sofa,
  Bed,
  Utensils,
  BookOpen,
  Home,
  Power,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';

interface RoomSpaceCardProps {
  room: Room;
  devices: Device[];
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onControlDevice?: (device: Device, command: string, params?: Record<string, any>) => Promise<void>;
  onSelectDevice?: (device: Device) => void;
}

export const RoomSpaceCard: React.FC<RoomSpaceCardProps> = ({
  room,
  devices,
  onEdit,
  onDelete,
  onControlDevice,
  onSelectDevice,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const roomDevices = devices.filter((d) => d.room_id === room.id);
  const onlineDevicesCount = roomDevices.filter((d) => d.status === 'online').length;

  const renderIcon = () => {
    switch (room.icon) {
      case 'sofa':
        return <Sofa className="w-5 h-5 text-blue-400" />;
      case 'bed':
        return <Bed className="w-5 h-5 text-purple-400" />;
      case 'utensils':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'book-open':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      default:
        return <Home className="w-5 h-5 text-cyan-400" />;
    }
  };

  // Ambient gradient based on room icon
  const getAmbientGradient = () => {
    switch (room.icon) {
      case 'sofa':
        return 'from-blue-600/15 via-transparent to-transparent';
      case 'bed':
        return 'from-purple-600/15 via-transparent to-transparent';
      case 'utensils':
        return 'from-amber-600/15 via-transparent to-transparent';
      case 'book-open':
        return 'from-emerald-600/15 via-transparent to-transparent';
      default:
        return 'from-cyan-600/15 via-transparent to-transparent';
    }
  };

  return (
    <div className="bg-[#131C31] hover:bg-[#16223B] border border-[#1E2D4A] hover:border-slate-600 rounded-card p-5 transition-all duration-300 shadow-card flex flex-col justify-between relative overflow-hidden group">
      {/* Ambient background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getAmbientGradient()} pointer-events-none opacity-80`} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0A0F1D] border border-[#1E2D4A] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              {renderIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {room.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-medium text-slate-400 bg-[#0A0F1D]/80 px-2 py-0.5 rounded border border-[#1E2D4A]">
                  {room.area}
                </span>
                <span className="text-[11px] text-slate-500">
                  {roomDevices.length} 台纳管设备
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(room)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E2D4A] transition"
              title="编辑空间"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(room)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="删除空间"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
          {room.description || '暂无空间说明备注'}
        </p>

        {/* Quick Micro Devices Strip */}
        {roomDevices.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>空间内部设备</span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
              >
                <span>{isExpanded ? '收起' : '展开设备'}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {isExpanded && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                {roomDevices.map((dev) => {
                  const isOnline = dev.status === 'online';
                  const isOn = dev.state?.state_value === 'on';
                  const canCtrl = isOnline || dev.is_demo;

                  return (
                    <div
                      key={dev.id}
                      onClick={() => onSelectDevice?.(dev)}
                      className="p-2 rounded-lg bg-[#0A0F1D]/80 border border-[#1E2D4A] flex items-center justify-between text-xs cursor-pointer hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-slate-200 truncate">{dev.name}</span>
                        {dev.is_demo && <span className="text-[10px] text-purple-400">[演示]</span>}
                      </div>

                      {onControlDevice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onControlDevice(dev, 'toggle');
                          }}
                          disabled={!canCtrl}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                            !canCtrl
                              ? 'text-slate-600 cursor-not-allowed'
                              : isOn
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-[#19243E] text-slate-400 border border-[#26375A]'
                          }`}
                        >
                          {isOn ? '已开' : '已关'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="relative z-10 pt-3 border-t border-[#1E2D4A] flex items-center justify-between text-xs text-slate-400">
        <div>
          <span>空间活跃率: </span>
          <span className="font-semibold text-slate-200">
            {roomDevices.length > 0 ? Math.round((onlineDevicesCount / roomDevices.length) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-beacon" />
          <span className="text-emerald-400 font-medium">{onlineDevicesCount} 台在线</span>
        </div>
      </div>
    </div>
  );
};
