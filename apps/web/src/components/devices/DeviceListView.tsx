import React from 'react';
import { Device } from '../../types';
import { Badge } from '../common/Badge';
import { Power, Info, Trash2, Edit2, AlertCircle } from 'lucide-react';

interface DeviceListViewProps {
  devices: Device[];
  onControl: (device: Device, command: string, params?: Record<string, any>) => Promise<void>;
  onOpenDetail: (device: Device) => void;
  onOpenEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

export const DeviceListView: React.FC<DeviceListViewProps> = ({
  devices,
  onControl,
  onOpenDetail,
  onOpenEdit,
  onDelete,
}) => {
  return (
    <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0A0F1D] text-slate-400 uppercase text-[11px] border-b border-[#1E2D4A]">
            <tr>
              <th className="py-3 px-4">设备名称</th>
              <th className="py-3 px-4">空间归属</th>
              <th className="py-3 px-4">类型 / 协议</th>
              <th className="py-3 px-4">运行环境</th>
              <th className="py-3 px-4">物理状态</th>
              <th className="py-3 px-4">状态快照</th>
              <th className="py-3 px-4 text-center">开关控制</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2D4A]/60 text-slate-300">
            {devices.map((device) => {
              const isOnline = device.status === 'online';
              const isDemo = device.is_demo;
              const canControl = isOnline || isDemo;
              const isOn = device.state?.state_value === 'on';

              return (
                <tr
                  key={device.id}
                  onClick={() => onOpenDetail(device)}
                  className="hover:bg-[#19243E]/50 transition cursor-pointer"
                >
                  {/* Name & Identifier */}
                  <td className="py-3.5 px-4 font-medium text-slate-100">
                    <div>{device.name}</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">{device.identifier}</div>
                  </td>

                  {/* Room */}
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-[#1A253E] border border-[#26375A] text-[11px]">
                      {device.room_name || '未分配空间'}
                    </span>
                  </td>

                  {/* Type / Protocol */}
                  <td className="py-3.5 px-4 text-slate-400 font-mono">
                    <span className="capitalize">{device.device_type}</span> / {device.protocol.toUpperCase()}
                  </td>

                  {/* Env Demo vs Real */}
                  <td className="py-3.5 px-4">
                    {isDemo ? <Badge variant="demo">演示沙箱</Badge> : <Badge variant="physical">物理实体</Badge>}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {isOnline ? <Badge variant="online">在线活跃</Badge> : <Badge variant="offline">离线未通</Badge>}
                  </td>

                  {/* Attributes snapshot */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                    {device.state?.attributes ? JSON.stringify(device.state.attributes) : device.state?.state_value || 'off'}
                  </td>

                  {/* Inline Toggle */}
                  <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onControl(device, 'toggle')}
                      disabled={!canControl}
                      className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition ${
                        !canControl
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                          : isOn
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          : 'bg-[#0A0F1D] hover:bg-[#1A253E] text-slate-300 border border-[#1E2D4A]'
                      }`}
                      title={!canControl ? '物理设备离线，严禁伪造控制' : '切换状态'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isOn ? '已开' : '已关'}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenDetail(device)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1A253E]"
                        title="查看详情"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(device)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          title="删除设备"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
