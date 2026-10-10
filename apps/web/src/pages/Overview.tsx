import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SystemOverview } from '../types';
import { Loading } from '../components/common/Loading';
import { Badge } from '../components/common/Badge';
import {
  Cpu,
  Wifi,
  WifiOff,
  Grid,
  Activity,
  AlertTriangle,
  RotateCw,
  PlusCircle,
  Database,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface OverviewProps {
  onNavigate: (tab: any) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<SystemOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.overview.get();
      setData(res);
    } catch (err: any) {
      setError(err.message || '获取总览数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await api.devices.seedDemo();
      await fetchOverview();
    } catch (err: any) {
      alert(err.message || '加载演示环境失败');
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading && !data) {
    return <Loading message="正在聚合家庭中枢实时数据..." className="h-96" />;
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-[#171F30] border border-rose-500/30 rounded-card m-6">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-200">数据同步异常</h3>
        <p className="text-sm text-rose-400 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
        >
          重新拉取
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Warning: Honest Offline State or Empty */}
      {data?.unconnected_warning && (
        <div className="p-4 rounded-card bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-200">物理状态感知与合规提醒</h4>
              <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
                {data.unconnected_warning}
              </p>
            </div>
          </div>

          {data.demo_devices === 0 && (
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>{isSeeding ? '生成中...' : '加载演示环境'}</span>
            </button>
          )}
        </div>
      )}

      {/* Metrics Row (12 columns grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Devices */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>总纳管设备</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{data?.total_devices ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">包含物理与演示实体</div>
        </div>

        {/* Online Devices */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>在线状态</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{data?.online_devices ?? 0}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">链路活跃保持</div>
        </div>

        {/* Offline Devices */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>未连接 / 离线</span>
            <WifiOff className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{data?.offline_devices ?? 0}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">如实呈现，绝不造假</div>
        </div>

        {/* Demo Devices */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>演示模拟设备</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{data?.demo_devices ?? 0}</div>
          <div className="text-[11px] text-purple-400/80 mt-1">隔离沙箱运行</div>
        </div>

        {/* Rooms */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>划分房间</span>
            <Grid className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{data?.total_rooms ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">家庭空间组织</div>
        </div>

        {/* Database Health */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>数据引擎</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-semibold text-cyan-300">SQLite WAL</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>高并发无锁运行</span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 rounded-card bg-[#171F30] border border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>核心模块直通：</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('devices')}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-blue-500/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>进入智能家居管理</span>
          </button>

          <button
            onClick={() => onNavigate('rooms')}
            className="px-3.5 py-1.5 rounded-lg bg-[#0B1020] hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            <span>配置家庭房间</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="px-3.5 py-1.5 rounded-lg bg-[#0B1020] hover:bg-slate-800 border border-[#1E293B] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>查看完整审计日志</span>
          </button>

          <button
            onClick={fetchOverview}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-[#1E293B] transition"
            title="刷新数据"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two columns: Recent Audits & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>最近操作审计记录</span>
            </h3>
            <span className="text-[11px] text-slate-500">最新 10 条</span>
          </div>

          <div className="space-y-2.5">
            {data?.recent_audits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">暂无操作审计记录</div>
            ) : (
              data?.recent_audits.map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 rounded-lg bg-[#0B1020]/60 border border-[#1E293B] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded text-[10px]">
                      {audit.username}
                    </span>
                    <span className="text-slate-200 font-medium">{audit.action}</span>
                    <span className="text-slate-500 text-[11px]">
                      {audit.target_type}: {audit.target_id?.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(audit.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>系统事件与状态变迁</span>
            </h3>
            <span className="text-[11px] text-slate-500">实时流水</span>
          </div>

          <div className="space-y-2.5">
            {data?.recent_events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">暂无系统事件记录</div>
            ) : (
              data?.recent_events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-lg bg-[#0B1020]/60 border border-[#1E293B] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={evt.level === 'error' ? 'danger' : evt.level === 'warning' ? 'warning' : 'primary'}>
                      {evt.source}
                    </Badge>
                    <span className="text-slate-300 truncate max-w-xs">{evt.message}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(evt.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
