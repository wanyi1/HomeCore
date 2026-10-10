import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { Loading } from '../components/common/Loading';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Lock,
  RotateCw,
  Clock,
  Terminal,
  FileText,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.logs.audit(50);
      setLogs(data);
    } catch (err) {
      console.error('获取审计日志失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          <span>系统设置与操作审计</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          本地主机配置、服务健康指标及全量安全操作审计链路
        </p>
      </div>

      {/* Grid: System Specs & Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* System Specs */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>主机运行环境</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">系统版本:</span>
              <span className="text-slate-200 font-mono">HomeCore V1.0 (阶段1 交付版)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">网络绑定策略:</span>
              <span className="text-emerald-400 font-mono">127.0.0.1 (本地回环，禁止外部免密接入)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">本地数据引擎:</span>
              <span className="text-cyan-400 font-mono">SQLite 3.x (WAL 无锁模式激活)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">后端 API 服务:</span>
              <span className="text-slate-200 font-mono">FastAPI 0.115+ (端口 8000)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">前端桌面 UI:</span>
              <span className="text-slate-200 font-mono">React 18 + Vite 5 (端口 5173)</span>
            </div>
          </div>
        </div>

        {/* Current Account Profile */}
        <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>当前登录管理员凭据</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">登录用户名:</span>
              <span className="text-slate-200 font-mono font-semibold">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">显示昵称:</span>
              <span className="text-slate-200">{user?.display_name}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">系统角色:</span>
              <span className="text-purple-400 font-semibold uppercase">{user?.role} (超级管理员)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[#1E293B]">
              <span className="text-slate-400">密码加密算法:</span>
              <span className="text-slate-300 font-mono">Bcrypt (动态盐，不可逆单向散列)</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">创建时间:</span>
              <span className="text-slate-400 font-mono">
                {user?.created_at ? new Date(user.created_at).toLocaleString() : '未知'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#171F30] border border-[#1E293B] rounded-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>操作行为审计流水 (Audit Trail)</span>
          </div>

          <button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg bg-[#0B1020] border border-[#1E293B] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="刷新日志"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <Loading message="正在检索安全审计记录..." className="h-48" />
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">暂无审计日志记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1020] text-slate-400 uppercase text-[11px] border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-3">时间</th>
                  <th className="py-2.5 px-3">操作人</th>
                  <th className="py-2.5 px-3">动作类型</th>
                  <th className="py-2.5 px-3">目标对象</th>
                  <th className="py-2.5 px-3">详情快照</th>
                  <th className="py-2.5 px-3">客户端IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1E293B]/40 transition">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      {log.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.target_type}: {log.target_id?.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
