import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { isInitialized, login, setup } = useAuth();
  const [username, setUsername] = useState('admin');
  const [displayName, setDisplayName] = useState('家庭管理员');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSetupMode = isInitialized === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetupMode) {
      if (!username.trim() || !displayName.trim() || !password) {
        setError('请完整填写所有必填字段');
        return;
      }
      if (password.length < 6) {
        setError('管理员密码长度不得少于 6 位');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致，请重新核对');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError('请输入用户名和密码');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isSetupMode) {
        await setup(username.trim(), password, displayName.trim());
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      <div className="w-full max-w-md bg-[#131C31]/90 border border-[#1E2D4A] rounded-card-lg shadow-2xl p-8 relative z-10 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/30 flex items-center justify-center text-white mb-4 shadow-glowBlue">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide flex items-center justify-center gap-2">
            HomeCore <span className="text-blue-400 text-sm font-mono px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30">V0.2</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            {isSetupMode ? '首次运行向导 · 设置家庭超级管理员' : '家庭数字操作系统 · 安全登录'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              管理员用户名
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: admin"
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-btn pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                个性化昵称
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如: 家庭管理员"
                  className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-btn pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              访问密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码 (至少 6 位)"
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-btn pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                确认输入密码
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入相同密码"
                  className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-btn pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-btn text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
          >
            {isSubmitting ? (
              <span>处理中...</span>
            ) : isSetupMode ? (
              <span>完成初始化并进入系统</span>
            ) : (
              <span>安全登 录</span>
            )}
          </button>
        </form>

        {/* Security badge note */}
        <div className="mt-8 pt-4 border-t border-[#1E2D4A] text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>本地加密存储 · 默认监听 127.0.0.1 · 绝对保障家庭数据主权</span>
          </p>
        </div>
      </div>
    </div>
  );
};
