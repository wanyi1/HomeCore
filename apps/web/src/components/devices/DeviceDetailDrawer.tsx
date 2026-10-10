import React, { useState } from 'react';
import { Device } from '../../types';
import { Drawer } from '../common/Drawer';
import { Badge } from '../common/Badge';
import {
  Cpu,
  Power,
  RotateCw,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  Layers,
} from 'lucide-react';

interface DeviceDetailDrawerProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onControl: (device: Device, command: string, params?: Record<string, any>) => Promise<void>;
}

export const DeviceDetailDrawer: React.FC<DeviceDetailDrawerProps> = ({
  device,
  isOpen,
  onClose,
  onControl,
}) => {
  const [copied, setCopied] = useState(false);
  const [isActing, setIsActing] = useState(false);

  if (!device) return null;

  const isOnline = device.status === 'online';
  const isDemo = device.is_demo;
  const canControl = isOnline || isDemo;

  const copyId = () => {
    navigator.clipboard.writeText(device.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (command: string, params: Record<string, any> = {}) => {
    setIsActing(true);
    try {
      await onControl(device, command, params);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={device.name}
      subtitle={`${device.room_name || '未分配空间'} · ${device.device_type.toUpperCase()} · ${device.protocol.toUpperCase()}`}
    >
      <div className="space-y-6 text-xs">
        {/* Status Alert Banner */}
        {!isOnline && !isDemo ? (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <WifiOff className="w-4 h-4 text-rose-400" />
              <span>物理设备当前未连接 / 离线</span>
            </div>
            <p className="text-[11px] text-rose-300/80">
              依照数据诚实原则，该设备无法下发任何硬件指令。请核实设备物理供电、局域网 IP 分配或网关接入状态。
            </p>
          </div>
        ) : isDemo ? (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">隔离演示沙箱运行中：</span>
              <p className="text-[11px] text-purple-300/80 mt-0.5">
                此设备为系统内置的隔离模拟器实体，控制状态在本地沙箱流转，不会影响真实物理家居。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 leading-relaxed flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>物理通信链路已建立并保持在线通信心跳</span>
          </div>
        )}

        {/* Quick Attributes Card */}
        <div className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-xl p-4 space-y-3">
          <h4 className="text-slate-400 font-semibold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>核心硬件元数据</span>
          </h4>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500 block">系统唯一 UUID:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-slate-200 truncate">{device.id}</span>
                <button
                  onClick={copyId}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                  title="复制 ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">物理/实体标识:</span>
              <span className="font-mono text-slate-200 block truncate mt-0.5">{device.identifier}</span>
            </div>

            <div>
              <span className="text-slate-500 block">通信协议:</span>
              <span className="text-slate-200 uppercase font-medium mt-0.5 block">{device.protocol}</span>
            </div>

            <div>
              <span className="text-slate-500 block">接入来源:</span>
              <span className="text-slate-200 font-medium mt-0.5 block">{device.source}</span>
            </div>

            <div>
              <span className="text-slate-500 block">最后活跃通信:</span>
              <span className="font-mono text-slate-300 mt-0.5 block">
                {device.last_seen ? new Date(device.last_seen).toLocaleString() : '未曾记录'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">登记纳管时间:</span>
              <span className="font-mono text-slate-300 mt-0.5 block">
                {new Date(device.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Capabilities Checklist */}
        <div className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-xl p-4 space-y-2.5">
          <h4 className="text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
            支持能力集合 (Capabilities)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {device.capabilities && device.capabilities.length > 0 ? (
              device.capabilities.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-lg bg-[#19243E] border border-[#26375A] text-slate-200 text-[11px] font-mono"
                >
                  ✓ {c}
                </span>
              ))
            ) : (
              <span className="text-slate-500">未声明特定能力</span>
            )}
          </div>
        </div>

        {/* Real-time State & Attributes JSON */}
        <div className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              实时状态快照 (State Attributes)
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              Value: {device.state?.state_value || 'off'}
            </span>
          </div>

          <pre className="p-3 bg-[#060913] border border-[#1E2D4A]/60 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
            {JSON.stringify(device.state?.attributes || {}, null, 2)}
          </pre>
        </div>

        {/* Test Control Actions */}
        <div className="pt-2 border-t border-[#1E2D4A] flex flex-wrap gap-2.5">
          <button
            onClick={() => handleAction('turn_on')}
            disabled={!canControl || isActing}
            className="flex-1 py-2 px-3 rounded-btn bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" />
            <span>下发开启</span>
          </button>

          <button
            onClick={() => handleAction('turn_off')}
            disabled={!canControl || isActing}
            className="flex-1 py-2 px-3 rounded-btn bg-[#1A253E] hover:bg-[#253557] disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 font-semibold transition border border-[#26375A] flex items-center justify-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" />
            <span>下发关闭</span>
          </button>
        </div>
      </div>
    </Drawer>
  );
};
