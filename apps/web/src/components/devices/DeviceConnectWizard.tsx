import React, { useState } from 'react';
import { Room } from '../../types';
import { Modal } from '../common/Modal';
import {
  Cpu,
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wifi,
  ExternalLink,
} from 'lucide-react';

interface DeviceConnectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onManualRegister: (data: any) => Promise<void>;
  onSeedDemo: () => Promise<void>;
}

export const DeviceConnectWizard: React.FC<DeviceConnectWizardProps> = ({
  isOpen,
  onClose,
  rooms,
  onManualRegister,
  onSeedDemo,
}) => {
  const [activeStep, setActiveStep] = useState<'choose' | 'manual'>('choose');
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    source: 'manual',
    protocol: 'wifi',
    device_type: 'light',
    room_id: '',
    capabilities: ['switch', 'brightness'],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.identifier.trim()) {
      setError('请填写设备名称及唯一物理标识 (如 MAC/Entity ID)');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onManualRegister({
        ...form,
        is_demo: false,
      });
      onClose();
      setActiveStep('choose');
    } catch (err: any) {
      setError(err.message || '登记设备失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setIsSubmitting(true);
    try {
      await onSeedDemo();
      onClose();
    } catch (err: any) {
      alert(err.message || '加载演示环境失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeStep === 'choose' ? '添加与接入智能设备' : '手动登记真实物理硬件'}
      maxWidth="max-w-xl"
    >
      {activeStep === 'choose' ? (
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            选择你希望接入设备的方式。HomeCore 坚持真实数据原则，无法建立通信的物理设备将如实显示为离线。
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {/* Option 1: Manual physical device registration */}
            <div
              onClick={() => setActiveStep('manual')}
              className="p-4 rounded-xl bg-[#0A0F1D] border border-[#1E2D4A] hover:border-blue-500/50 hover:bg-[#121A2D] cursor-pointer transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                    手动登记真实硬件
                  </h4>
                  <p className="text-slate-400 mt-0.5 text-[11px]">
                    输入 Wi-Fi/Zigbee 硬件 MAC 或实体 ID 纳管，初始诚实显示未连接态
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>

            {/* Option 2: Isolated Demo Simulator Seed */}
            <div
              onClick={handleSeed}
              className="p-4 rounded-xl bg-[#0A0F1D] border border-purple-500/30 hover:border-purple-500/60 hover:bg-[#18152B] cursor-pointer transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-200 group-hover:text-purple-100 transition-colors">
                    加载演示模拟沙箱环境
                  </h4>
                  <p className="text-slate-400 mt-0.5 text-[11px]">
                    一键载入客厅灯光、空调等虚拟设备，完全隔离测试调光调温体验
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-400 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30">
                {isSubmitting ? '加载中...' : '一键生成'}
              </span>
            </div>

            {/* Option 3: Integration Preview */}
            <div className="p-4 rounded-xl bg-[#0A0F1D]/60 border border-[#1E2D4A] flex items-center justify-between opacity-80">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">
                    外部平台集成 (Home Assistant / MQTT)
                  </h4>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    规划于阶段 2 交付：通过 REST / WebSocket 自动发现家庭全量实体
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                阶段2
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>数据诚实规范：</strong>
              <span> 手动登记的物理硬件在未建立物理链路通信前，将如实标为【未连接/离线】并拦截指令下发，禁止伪造在线态。</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              设备名称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如: 客厅落地灯、主卧空气净化器"
              className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              物理标识 (MAC / Entity ID / IEEE) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="例如: 28:6d:cd:xx:xx:xx 或 light.living_lamp"
              className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">设备类型</label>
              <select
                value={form.device_type}
                onChange={(e) => setForm({ ...form, device_type: e.target.value })}
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="light">照明灯具 (Light)</option>
                <option value="switch">开关插座 (Switch)</option>
                <option value="climate">温控空调 (Climate)</option>
                <option value="sensor">环境传感 (Sensor)</option>
                <option value="curtain">窗帘电机 (Curtain)</option>
                <option value="media">影音媒体 (Media)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">通信协议</label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="wifi">Wi-Fi / LAN</option>
                <option value="zigbee">Zigbee 网关</option>
                <option value="matter">Matter 协议</option>
                <option value="ble">蓝牙 Mesh</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">分配家庭空间</label>
            <select
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">暂不分配 (未分配空间)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.area})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
            <button
              type="button"
              onClick={() => setActiveStep('choose')}
              className="text-slate-400 hover:text-slate-200 transition"
            >
              ← 返回上一步
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-[#0A0F1D] hover:bg-[#1A253E] text-slate-300"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
              >
                {isSubmitting ? '登记中...' : '完成登记'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
