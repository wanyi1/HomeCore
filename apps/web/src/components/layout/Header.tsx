import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';
import { LogOut, User as UserIcon, Server } from 'lucide-react';

interface HeaderProps {
  currentTab: NavItemKey;
}

const TAB_TITLES: Record<NavItemKey, { title: string; subtitle: string }> = {
  overview: { title: '家庭总览', subtitle: '实时设备健康、房间分布及近期动态' },
  devices: { title: '智能家居', subtitle: '设备纳管、状态同步与控制中心' },
  rooms: { title: '房间管理', subtitle: '空间区域划分与实体归属组织' },
  automation: { title: '自动化', subtitle: '智能场景编排与规则引擎 (阶段2接入)' },
  network: { title: '家庭网络', subtitle: '子网扫描与拓扑感知 (阶段3接入)' },
  monitoring: { title: '系统监控', subtitle: '主机资源与服务探针 (阶段3接入)' },
  energy: { title: '环境能耗', subtitle: '温湿度与真实计量统计 (阶段3接入)' },
  'ai-butler': { title: 'AI家庭管家', subtitle: '本地自然语言控制与审计 (阶段3接入)' },
  security: { title: '安防告警', subtitle: '规则阈值与入侵防范 (阶段3接入)' },
  'family-life': { title: '家庭生活', subtitle: '家庭日程与便签待办' },
  analytics: { title: '数据分析', subtitle: '设备活跃度与能耗统计' },
  plugins: { title: '插件中心', subtitle: '协议扩展与生态集成' },
  settings: { title: '系统设置', subtitle: '本地管理员权限、审计日志与维护' },
};

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { user, logout } = useAuth();
  const info = TAB_TITLES[currentTab] || { title: 'HomeCore', subtitle: '数字家庭中枢' };

  return (
    <header className="h-16 bg-[#0E1528] border-b border-[#1E293B] px-6 flex items-center justify-between flex-shrink-0 select-none">
      <div>
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {info.title}
        </h2>
        <p className="text-xs text-slate-400">{info.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Server status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#171F30] border border-[#1E293B] text-xs text-slate-300">
          <Server className="w-3.5 h-3.5 text-blue-400" />
          <span>服务状态:</span>
          <span className="text-emerald-400 font-medium">健康 (8000)</span>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-[#1E293B]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-200">{user.display_name}</div>
                <div className="text-[11px] text-slate-400 capitalize">
                  {user.role === 'admin' ? '系统管理员' : user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="登出系统"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
