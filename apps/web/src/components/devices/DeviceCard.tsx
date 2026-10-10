import React, { useState } from 'react';
import { Device } from '../../types';
import { Badge } from '../common/Badge';
import {
  Lightbulb,
  Thermometer,
  Power,
  Sliders,
  Tv,
  Info,
  Trash2,
  Edit2,
  Minus,
  Plus,
  Blinds,
  ShieldCheck,
  AlertTriangle,
  ToggleLeft,
} from 'lucide-react';

interface DeviceCardProps {
  device: Device;
  onControl: (device: Device, command: string, params?: Record<string, any>) => Promise<void>;
  onOpenDetail: (device: Device) => void;
  onOpenEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onControl,
  onOpenDetail,
  onOpenEdit,
  onDelete,
}) => {
  const [isControlling, setIsControlling] = useState(false);
  const isOnline = device.status === 'online';
  const isDemo = device.is_demo;
  const canControl = isOnline || isDemo;
  const isOn = device.state?.state_value === 'on';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsControlling(true);
    try {
      await onControl(device, 'toggle');
    } finally {
      setIsControlling(false);
    }
  };

  const handleBrightnessChange = async (e: React.MouseEvent, brightness: number) => {
    e.stopPropagation();
    setIsControlling(true);
    try {
      await onControl(device, 'set_brightness', { brightness });
    } finally {
      setIsControlling(false);
    }
  };

  const handleTempAdjust = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const currentTemp = device.state?.attributes?.target_temperature || 26.0;
    const newTemp = Math.round((currentTemp + delta) * 10) / 10;
    setIsControlling(true);
    try {
      await onControl(device, 'set_temperature', { temperature: newTemp });
    } finally {
      setIsControlling(false);
    }
  };

  const renderIcon = () => {
    switch (device.device_type) {
      case 'light':
        return <Lightbulb className={`w-5 h-5 ${isOn && canControl ? 'text-amber-300' : 'text-slate-400'}`} />;
      case 'climate':
        return <Thermometer className={`w-5 h-5 ${isOn && canControl ? 'text-cyan-300' : 'text-slate-400'}`} />;
      case 'sensor':
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      case 'curtain':
        return <Blinds className="w-5 h-5 text-indigo-400" />;
      case 'media':
        return <Tv className="w-5 h-5 text-pink-400" />;
      default:
        return <ToggleLeft className={`w-5 h-5 ${isOn && canControl ? 'text-blue-400' : 'text-slate-400'}`} />;
    }
  };

  const brightness = device.state?.attributes?.brightness || 0;
  const targetTemp = device.state?.attributes?.target_temperature || 26.0;

  return (
    <div
      onClick={() => onOpenDetail(device)}
      className={`relative group rounded-card p-5 cursor-pointer transition-all duration-300 border flex flex-col justify-between overflow-hidden ${
        isOn && canControl
          ? device.device_type === 'light'
            ? 'bg-gradient-to-br from-[#1C2337] via-[#141C30] to-[#12192A] border-amber-500/30 shadow-glowAmber/20'
            : device.device_type === 'climate'
            ? 'bg-gradient-to-br from-[#122436] via-[#131E33] to-[#111728] border-cyan-500/30 shadow-glowBlue/20'
            : 'bg-gradient-to-br from-[#16223B] via-[#131C31] to-[#10172A] border-blue-500/30 shadow-glowBlue/15'
          : 'bg-[#131C31] hover:bg-[#16223B] border-[#1E2D4A] hover:border-slate-600 shadow-card'
      }`}
    >
      {/* Demo / Source ribbon corner tag */}
      {isDemo ? (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-sm">
          演示沙箱
        </div>
      ) : device.source === 'homeassistant' ? (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-cyan-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-sm">
          Home Assistant
        </div>
      ) : device.source === 'mqtt' ? (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-teal-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg tracking-wider uppercase shadow-sm">
          MQTT 物理
        </div>
      ) : null}


      <div>
        {/* Top bar: Icon, Name, Room, Actions */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isOn && canControl
                  ? device.device_type === 'light'
                    ? 'bg-amber-500/20 border border-amber-400/40 shadow-sm shadow-amber-500/30'
                    : device.device_type === 'climate'
                    ? 'bg-cyan-500/20 border border-cyan-400/40 shadow-sm shadow-cyan-500/30'
                    : 'bg-blue-500/20 border border-blue-400/40 shadow-sm shadow-blue-500/30'
                  : 'bg-[#0A0F1D] border border-[#1E2D4A]'
              }`}
            >
              {renderIcon()}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors flex items-center gap-1.5 line-clamp-1">
                {device.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {device.room_name || '未分配房间'} · {device.protocol.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onOpenDetail(device)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E2D4A] transition"
              title="查看详情"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(device)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="移除设备"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          {isDemo ? (
            <Badge variant="demo">沙箱环境</Badge>
          ) : (
            <Badge variant="physical">实体物理</Badge>
          )}

          {isOnline ? (
            <Badge variant="online">通信在线</Badge>
          ) : (
            <Badge variant="offline">离线未通</Badge>
          )}

          <Badge variant="subtle">来源: {device.source}</Badge>
        </div>

        {/* Specific Interactive Sub-controls */}
        {device.device_type === 'light' && (
          <div className="bg-[#0A0F1D]/75 rounded-xl p-2.5 border border-[#1E2D4A]/60 mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">亮度调光</span>
              <span className="font-mono text-slate-200 font-semibold">{isOn && canControl ? `${brightness}%` : '关闭'}</span>
            </div>
            {canControl ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {[0, 25, 50, 75, 100].map((level) => (
                  <button
                    key={level}
                    onClick={(e) => handleBrightnessChange(e, level)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono font-medium transition ${
                      brightness === level && isOn
                        ? 'bg-amber-500 text-slate-900 font-bold shadow-sm'
                        : 'bg-[#19243E] hover:bg-[#233355] text-slate-300'
                    }`}
                  >
                    {level === 0 ? '关' : `${level}%`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>设备离线，调光不可用</span>
              </div>
            )}
          </div>
        )}

        {device.device_type === 'climate' && (
          <div className="bg-[#0A0F1D]/75 rounded-xl p-2.5 border border-[#1E2D4A]/60 mb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">设定目标温度</span>
              <div className="text-base font-bold font-mono text-cyan-300">
                {targetTemp}°C
              </div>
            </div>

            {canControl ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleTempAdjust(e, -0.5)}
                  className="w-7 h-7 rounded-lg bg-[#19243E] hover:bg-[#233355] text-slate-200 flex items-center justify-center transition active:scale-90"
                  title="降低 0.5°C"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleTempAdjust(e, 0.5)}
                  className="w-7 h-7 rounded-lg bg-[#19243E] hover:bg-[#233355] text-slate-200 flex items-center justify-center transition active:scale-90"
                  title="升高 0.5°C"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-rose-400 font-medium">离线不可控</span>
            )}
          </div>
        )}

        {device.device_type === 'sensor' && (
          <div className="bg-[#0A0F1D]/75 rounded-xl p-2.5 border border-[#1E2D4A]/60 mb-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">最新遥测指标</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {JSON.stringify(device.state?.attributes || '正常')}
            </span>
          </div>
        )}
      </div>

      {/* Bottom bar: Identifier & Main Power Toggle */}
      <div className="pt-3 border-t border-[#1E2D4A]/80 flex items-center justify-between gap-2 mt-auto">
        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[130px]" title={device.identifier}>
          {device.identifier}
        </div>

        <button
          onClick={handleToggle}
          disabled={!canControl || isControlling}
          className={`px-3 py-1.5 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
            !canControl
              ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-70'
              : isOn
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
              : 'bg-[#0A0F1D] hover:bg-[#1A253E] text-slate-300 border border-[#1E2D4A]'
          }`}
          title={!canControl ? '物理设备处于离线状态，严禁伪造控制' : '切换开关状态'}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{isControlling ? '指令下发...' : isOn ? '已开启' : '已关闭'}</span>
        </button>
      </div>
    </div>
  );
};
