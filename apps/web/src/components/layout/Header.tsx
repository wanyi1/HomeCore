import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavItemKey } from './Sidebar';
import {
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';

interface HeaderProps {
  currentTab: NavItemKey;
  onQuickSearch?: () => void;
}

const TAB_TITLES: Record<NavItemKey, { title: string; subtitle: string }> = {
  overview: { title: '家庭数字驾驶舱', subtitle: '实时总览全屋状态、快捷场景切换与环境流' },
  devices: { title: '智能家居控制中心', subtitle: '房间聚合分组、设备卡片控制与元数据管理' },
  rooms: { title: '家庭空间管理', subtitle: '楼层区域组织、空间卡片与二维户型预留' },
  integrations: { title: '物联网协议接入中枢', subtitle: 'Home Assistant 与 MQTT 真实物理链路、实体发现与双工监听' },
  automation: { title: '自动化与场景编排', subtitle: '事件触发、条件过滤与规则引擎 (阶段2接入)' },

  network: { title: '家庭网络拓扑', subtitle: '受控子网扫描与真实链路拓扑 (阶段3接入)' },
  monitoring: { title: '系统监控与主机健康', subtitle: '主力PC性能指标与探针 (阶段3接入)' },
  energy: { title: '环境能耗统计', subtitle: '真实物理计量与时序趋势 (阶段3接入)' },
  'ai-butler': { title: 'AI 家庭管家', subtitle: '本地自然语言对话与权限拦截 (阶段3接入)' },
  security: { title: '安防与告警中心', subtitle: '安全防线与防扰窗口 (阶段3接入)' },
  'family-life': { title: '家庭生活空间', subtitle: '家庭日程协同与购物便签' },
  analytics: { title: '数据分析中心', subtitle: '使用频率与系统运行多维报表' },
  plugins: { title: '生态与插件中心', subtitle: '多协议适配器与可信插件管理' },
  settings: { title: '系统设置与审计流水', subtitle: '本地管理员权限、操作审计与配置管理' },
};

export const Header: React.FC<HeaderProps> = ({ currentTab, onQuickSearch }) => {
  const { user, logout } = useAuth();
  const info = TAB_TITLES[currentTab] || { title: 'HomeCore', subtitle: '家庭智能操作系统' };

  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('欢迎回到家庭中枢');

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      const hour = now.getHours();
      if (hour >= 5 && hour < 11) {
        setGreeting('清晨好，家庭管理员 · 新的一天，全屋设备平稳运行');
      } else if (hour >= 11 && hour < 13) {
        setGreeting('中午好，家庭管理员 · 家居环境温湿度适宜');
      } else if (hour >= 13 && hour < 18) {
        setGreeting('下午好，家庭管理员 · 智能中枢持续守护家庭');
      } else {
        setGreeting('夜深了，家庭管理员 · 夜间安防与照明保护已就绪');
      }
    };

    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-[#0E1528]/85 backdrop-blur-md border-b border-[#1E2D4A] px-6 flex items-center justify-between flex-shrink-0 select-none z-10 relative">
      {/* Title & living greeting */}
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>{info.title}</span>
        </h2>
        <p className="text-xs text-slate-400 hidden sm:block mt-0.5">{greeting}</p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A0F1D] border border-[#1E2D4A] text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{currentTime}</span>
        </div>

        {/* Local Security Shield Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>本地数据中枢 (127.0.0.1)</span>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-[#1E2D4A]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-200">{user.display_name}</div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {user.role === 'admin' ? '家庭超级管理员' : user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="安全注销会话"
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
