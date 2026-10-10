import React from 'react';
import {
  Home,
  Cpu,
  Grid,
  Zap,
  Network,
  Activity,
  BatteryCharging,
  Bot,
  ShieldAlert,
  Calendar,
  BarChart3,
  Package,
  Settings,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export type NavItemKey =
  | 'overview'
  | 'devices'
  | 'rooms'
  | 'automation'
  | 'network'
  | 'monitoring'
  | 'energy'
  | 'ai-butler'
  | 'security'
  | 'family-life'
  | 'analytics'
  | 'plugins'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
}

interface NavSection {
  title: string;
  items: {
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tag?: string;
    isReady: boolean;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: '核心控制中枢',
    items: [
      { key: 'overview', label: '家庭总览', icon: Home, isReady: true },
      { key: 'devices', label: '智能家居', icon: Cpu, isReady: true },
      { key: 'rooms', label: '空间管理', icon: Grid, isReady: true },
    ],
  },
  {
    title: '场景与网络感知',
    items: [
      { key: 'automation', label: '自动化场景', icon: Zap, tag: '阶段2', isReady: false },
      { key: 'network', label: '家庭网络', icon: Network, tag: '阶段3', isReady: false },
      { key: 'monitoring', label: '主机监控', icon: Activity, tag: '阶段3', isReady: false },
      { key: 'energy', label: '环境能耗', icon: BatteryCharging, tag: '阶段3', isReady: false },
    ],
  },
  {
    title: '管家与安全防护',
    items: [
      { key: 'ai-butler', label: 'AI 家庭管家', icon: Bot, tag: '阶段3', isReady: false },
      { key: 'security', label: '安防告警', icon: ShieldAlert, tag: '阶段3', isReady: false },
    ],
  },
  {
    title: '生态与系统运维',
    items: [
      { key: 'family-life', label: '家庭生活', icon: Calendar, tag: '扩展', isReady: false },
      { key: 'analytics', label: '数据分析', icon: BarChart3, tag: '扩展', isReady: false },
      { key: 'plugins', label: '插件中心', icon: Package, tag: '扩展', isReady: false },
      { key: 'settings', label: '系统设置', icon: Settings, isReady: true },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#0A0F1D] border-r border-[#1E2D4A] flex flex-col h-screen select-none relative z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#1E2D4A] bg-[#0E1528]/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wider text-slate-100 flex items-center gap-1.5">
            HomeCore
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
              V0.2
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">全能家庭智能中枢</p>
        </div>
      </div>

      {/* Nav Section Lists */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 px-3 py-1 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => onSelectTab(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#131C31]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.tag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1A253E] text-slate-400 border border-[#26375A] scale-90">
                      {item.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3.5 border-t border-[#1E2D4A] bg-[#0E1528]/90">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-beacon" />
            <span className="font-medium text-slate-300 text-[11px]">本地微内核：正常</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">127.0.0.1</span>
        </div>
      </div>
    </aside>
  );
};
