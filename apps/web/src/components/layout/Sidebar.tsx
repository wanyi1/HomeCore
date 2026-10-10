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

interface MenuConfig {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  isReady: boolean;
}

const MENU_ITEMS: MenuConfig[] = [
  { key: 'overview', label: '家庭总览', icon: Home, isReady: true },
  { key: 'devices', label: '智能家居', icon: Cpu, isReady: true },
  { key: 'rooms', label: '房间管理', icon: Grid, isReady: true },
  { key: 'automation', label: '自动化', icon: Zap, tag: 'P0 待接', isReady: false },
  { key: 'network', label: '家庭网络', icon: Network, tag: 'P1 待接', isReady: false },
  { key: 'monitoring', label: '系统监控', icon: Activity, tag: 'P1 待接', isReady: false },
  { key: 'energy', label: '环境能耗', icon: BatteryCharging, tag: 'P1 待接', isReady: false },
  { key: 'ai-butler', label: 'AI管家', icon: Bot, tag: 'P1 待接', isReady: false },
  { key: 'security', label: '安防告警', icon: ShieldAlert, tag: 'P1 待接', isReady: false },
  { key: 'family-life', label: '家庭生活', icon: Calendar, tag: 'P2 待接', isReady: false },
  { key: 'analytics', label: '数据分析', icon: BarChart3, tag: 'P2 待接', isReady: false },
  { key: 'plugins', label: '插件中心', icon: Package, tag: 'P2 待接', isReady: false },
  { key: 'settings', label: '系统设置', icon: Settings, isReady: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#0B1020] border-r border-[#1E293B] flex flex-col h-screen select-none">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#1E293B]">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wider text-slate-100 flex items-center gap-1.5">
            HomeCore
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">V1.0</span>
          </h1>
          <p className="text-[11px] text-slate-400">家庭数字操作系统</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[11px] font-medium text-slate-500 px-3 pb-2 uppercase tracking-wider">
          主控导航
        </div>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#171F30]'
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 scale-90">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0E1528]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>本地引擎：在线</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">127.0.0.1</span>
        </div>
      </div>
    </aside>
  );
};
