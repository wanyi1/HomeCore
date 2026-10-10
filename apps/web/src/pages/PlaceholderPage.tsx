import React from 'react';
import { NavItemKey } from '../components/layout/Sidebar';
import {
  Zap,
  Network,
  Activity,
  BatteryCharging,
  Bot,
  ShieldAlert,
  Calendar,
  BarChart3,
  Package,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface PlaceholderPageProps {
  tabKey: NavItemKey;
  onNavigate: (tab: NavItemKey) => void;
}

const META_MAP: Record<
  string,
  {
    title: string;
    phase: string;
    desc: string;
    highlights: string[];
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  automation: {
    title: '自动化与场景编排中心',
    phase: '阶段 2 重点交付',
    desc: '基于设备状态事件与时间触发器的本地规则引擎，支持断电重启自动恢复与死循环保护。',
    highlights: ['手动执行场景模式', '定时与日落联动触发', '状态差分触发与多条件过滤', '执行日志与死循环保护'],
    icon: Zap,
  },
  network: {
    title: '家庭网络拓扑感知',
    phase: '阶段 3 交付',
    desc: '受控局域网子网扫描、ARP/ICMP探测、主机名与厂商识别，严格区分证实与推测网络链路。',
    highlights: ['局域网受控设备清单', '网络可达性与延迟时序', '链路拓扑关系图', 'CSV/Excel 导出'],
    icon: Network,
  },
  monitoring: {
    title: '主机资源与服务监控',
    phase: '阶段 3 交付',
    desc: '实时采集 Windows 主机 CPU、内存、磁盘 IO、系统服务健康度及阈值异常预警。',
    highlights: ['主力PC系统性能探针', '远端授权小主机节点纳管', '阈值告警触发器', '关键守护进程监控'],
    icon: Activity,
  },
  energy: {
    title: '环境监测与真实能耗统计',
    phase: '阶段 3 交付',
    desc: '严格对接物理传感器与真实计量实体，严禁凭空估算用电量，提供日/月耗电报表。',
    highlights: ['真实环境传感器趋势图', '计量插座实体电量读数', '缺测说明与时序校准', '高耗能异常诊断'],
    icon: BatteryCharging,
  },
  'ai-butler': {
    title: 'AI 家庭管家',
    phase: '阶段 3 交付',
    desc: '本地优先自然语言对话中枢，调用经严格权限鉴权的工具集，高风险操作强制二次确认。',
    highlights: ['自然语言设备查询与控制', '自动化规则草拟与建议', '系统告警智能解释', '密钥本地存储不外泄'],
    icon: Bot,
  },
  security: {
    title: '安防与告警中心',
    phase: '阶段 3 交付',
    desc: '多级安全规则防线、告警去重抑制与免打扰时间窗，严禁未经二次验证的高风险操作。',
    highlights: ['多级告警规则配置', '告警确认与关闭处理', '通知通道适配器', '门窗与传感器防线'],
    icon: ShieldAlert,
  },
  'family-life': {
    title: '家庭生活空间',
    phase: '阶段 4 扩展',
    desc: '共享家庭日历、购物待办事项与家庭成员协作看板。',
    highlights: ['家庭日程共享', '物资备忘录', '公告与便签协同'],
    icon: Calendar,
  },
  analytics: {
    title: '数据分析与报表中心',
    phase: '阶段 4 扩展',
    desc: '设备使用频度、场景触发效率与系统健康度综合多维统计分析。',
    highlights: ['设备活跃度热力图', '场景效率统计', '全量指标多维报表'],
    icon: BarChart3,
  },
  plugins: {
    title: '扩展与插件中心',
    phase: '阶段 4 扩展',
    desc: '协议扩展适配器（Home Assistant, MQTT, Zigbee2MQTT 等）的可插拔管理。',
    highlights: ['受信任插件安装', '协议适配器热插拔', '开发者扩展接口规范'],
    icon: Package,
  },
};

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ tabKey, onNavigate }) => {
  const meta = META_MAP[tabKey] || {
    title: '功能规划中',
    phase: '后续阶段',
    desc: '该功能模块正在按工程路线图开发中。',
    highlights: ['标准模块化分层架构', '可复现测试验收规范'],
    icon: Clock,
  };
  const Icon = meta.icon;

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card-lg p-8 w-full text-center shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4 shadow-glowBlue">
          <Icon className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A253E] border border-[#26375A] text-xs font-semibold text-blue-300 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{meta.phase}</span>
        </div>

        <h3 className="text-xl font-bold text-slate-100 mb-2">{meta.title}</h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed mb-6">
          {meta.desc}
        </p>

        {/* Planned highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-8 text-left">
          {meta.highlights.map((h, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#0A0F1D] border border-[#1E2D4A] text-xs text-slate-300 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[#1E2D4A] flex items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('overview')}
            className="px-4 py-2 rounded-btn bg-[#0A0F1D] hover:bg-[#1A253E] border border-[#1E2D4A] text-slate-300 text-xs font-medium transition"
          >
            返回家庭驾驶舱
          </button>
          <button
            onClick={() => onNavigate('devices')}
            className="px-4 py-2 rounded-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 active:scale-95"
          >
            <span>进入智能家居中心</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
