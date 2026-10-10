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
    <div className="min-h-screen bg-[#0B1020] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
      <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

      <div className="w-full max-w-md bg-[#171F30] border border-[#1E293B] rounded-card shadow-2xl p-8 relative z-10 backdrop-blur-md">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide">
            HomeCore <span className="text-blue-400 text-lg">V1.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isSetupMode ? '首次启动 — 初始化本地管理员账户' : '本地安全登录'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              用户名
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: admin"
                className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                用户昵称
              </label>
              <div className="relative">
                <Sparkles className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如: 家庭管理员"
                  className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码 (至少6位)"
                className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                确认密码
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  className="w-full bg-[#0B1020] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {isSubmitting ? (
              <span>处理中...</span>
            ) : isSetupMode ? (
              <span>完成初始化并进入系统</span>
            ) : (
              <span>登 录</span>
            )}
          </button>
        </form>

        {/* Security badge note */}
        <div className="mt-8 pt-4 border-t border-[#1E293B] text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-600" />
            <span>本地加密存储 · 默认监听 127.0.0.1 · 绝对保障家庭数据隐私</span>
          </p>
        </div>
      </div>
    </div>
  );
};
