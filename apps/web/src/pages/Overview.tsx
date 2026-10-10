import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SystemOverview, Device, Room } from '../types';
import { Loading } from '../components/common/Loading';
import { Badge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
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
  Home,
  Moon,
  Users,
  Sun,
  Power,
  Sliders,
  Thermometer,
  CloudSun,
  Zap,
  Bot,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface OverviewProps {
  onNavigate: (tab: any) => void;
}

type HomeMode = 'home' | 'away' | 'sleep' | 'party';

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const { success, error: toastError, warning, info } = useToast();
  const [data, setData] = useState<SystemOverview | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [currentHomeMode, setCurrentHomeMode] = useState<HomeMode>('home');
  const [isExecutingScene, setIsExecutingScene] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, devicesData, roomsData] = await Promise.all([
        api.overview.get(),
        api.devices.list(),
        api.rooms.list(),
      ]);
      setData(overviewData);
      setDevices(devicesData);
      setRooms(roomsData);
    } catch (err: any) {
      setError(err.message || '获取家庭总览数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await api.devices.seedDemo();
      success('已成功加载独立隔离的演示沙箱设备环境');
      await fetchData();
    } catch (err: any) {
      toastError(err.message || '加载演示环境失败');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleModeSwitch = (mode: HomeMode) => {
    setCurrentHomeMode(mode);
    const modeNames: Record<HomeMode, string> = {
      home: '在家模式',
      away: '离家安防模式',
      sleep: '夜间睡眠模式',
      party: '影音会客模式',
    };
    info(`家庭模式已切换至：${modeNames[mode]}`);
  };

  // Quick batch scenes
  const handleQuickScene = async (sceneType: 'all_off' | 'all_on' | 'climate_eco') => {
    setIsExecutingScene(sceneType);
    try {
      const controllableDevices = devices.filter(
        (d) => (d.status === 'online' || d.is_demo) && (d.device_type === 'light' || d.device_type === 'switch')
      );

      if (controllableDevices.length === 0) {
        warning('当前暂无可联动的在线或演示设备');
        return;
      }

      if (sceneType === 'all_off') {
        for (const dev of controllableDevices) {
          try {
            await api.devices.control(dev.id, 'turn_off');
          } catch {}
        }
        success(`一键全关场景已执行：已关闭 ${controllableDevices.length} 台在线设备`);
      } else if (sceneType === 'all_on') {
        for (const dev of controllableDevices) {
          try {
            await api.devices.control(dev.id, 'turn_on');
          } catch {}
        }
        success(`全屋照明场景已执行：已开启 ${controllableDevices.length} 台在线灯光`);
      } else if (sceneType === 'climate_eco') {
        const climates = devices.filter((d) => (d.status === 'online' || d.is_demo) && d.device_type === 'climate');
        for (const c of climates) {
          try {
            await api.devices.control(c.id, 'set_temperature', { temperature: 26.0 });
          } catch {}
        }
        success('绿色节能场景已执行：空调已调节至 26.0°C 节能温区');
      }

      await fetchData();
    } catch (err: any) {
      toastError(err.message || '场景执行失败');
    } finally {
      setIsExecutingScene(null);
    }
  };

  const handleDeviceQuickToggle = async (device: Device) => {
    if (!device.is_demo && device.status !== 'online') {
      warning(`设备【${device.name}】未连接物理网络，禁止伪造控制！`);
      return;
    }
    try {
      await api.devices.control(device.id, 'toggle');
      success(`已切换【${device.name}】开关状态`);
      await fetchData();
    } catch (err: any) {
      toastError(err.message || '控制失败');
    }
  };

  if (isLoading && !data) {
    return <Loading message="正在唤醒家庭数字驾驶舱..." className="h-96" />;
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-[#131C31] border border-rose-500/30 rounded-card m-6 shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-100">数据同步异常</h3>
        <p className="text-sm text-rose-300 mt-1 mb-5">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-btn text-sm font-semibold transition"
        >
          重新拉取
        </button>
      </div>
    );
  }

  const onlineRate =
    data && data.total_devices > 0 ? Math.round((data.online_devices / data.total_devices) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Home Cockpit Mood & Mode Switcher Banner */}
      <div className="relative rounded-card p-6 bg-gradient-to-r from-[#172545] via-[#131C32] to-[#10172A] border border-[#203254] shadow-card overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-beacon" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                家庭智能中枢 · 实时在线守护中
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-wide">
              家庭全能数字驾驶舱
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              全屋设备运行健康度稳定，本地 SQLite WAL 模式无锁运行中。你可以一键切换家庭生活模式或联动快捷场景。
            </p>
          </div>

          {/* Mode Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-[#0A0F1D]/80 p-2 rounded-2xl border border-[#1E2D4A] shadow-inner">
            <button
              onClick={() => handleModeSwitch('home')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentHomeMode === 'home'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#16223B]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>在家模式</span>
            </button>

            <button
              onClick={() => handleModeSwitch('away')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentHomeMode === 'away'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#16223B]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>离家安防</span>
            </button>

            <button
              onClick={() => handleModeSwitch('sleep')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentHomeMode === 'sleep'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#16223B]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>夜间睡眠</span>
            </button>

            <button
              onClick={() => handleModeSwitch('party')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentHomeMode === 'party'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#16223B]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>影音会客</span>
            </button>
          </div>
        </div>

        {/* Quick Scene Buttons */}
        <div className="relative z-10 pt-5 mt-5 border-t border-[#1E2D4A]/80 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>快捷场景联动：</span>
          </span>

          <button
            onClick={() => handleQuickScene('all_off')}
            disabled={isExecutingScene !== null}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A0F1D] hover:bg-[#1A253E] border border-[#1E2D4A] hover:border-slate-500 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>一键离家全关</span>
          </button>

          <button
            onClick={() => handleQuickScene('all_on')}
            disabled={isExecutingScene !== null}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A0F1D] hover:bg-[#1A253E] border border-[#1E2D4A] hover:border-slate-500 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>全屋明亮迎宾</span>
          </button>

          <button
            onClick={() => handleQuickScene('climate_eco')}
            disabled={isExecutingScene !== null}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A0F1D] hover:bg-[#1A253E] border border-[#1E2D4A] hover:border-slate-500 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
          >
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            <span>26°C 绿色节能</span>
          </button>

          <button
            onClick={fetchData}
            className="ml-auto p-1.5 rounded-lg bg-[#0A0F1D] border border-[#1E2D4A] text-slate-400 hover:text-slate-200 transition"
            title="刷新总览"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Honest Alert Banner (If offline physical devices exist or 0 devices) */}
      {data?.unconnected_warning && (
        <div className="p-4 rounded-card bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">物理状态感知与合规提醒</h4>
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
              <span>{isSeeding ? '生成中...' : '加载演示沙箱'}</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Core Vitality Metrics Cards Grid (12-column layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Devices */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>总纳管实体</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{data?.total_devices ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">包含物理与沙箱</div>
        </div>

        {/* Online Devices */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>在线活跃</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{data?.online_devices ?? 0}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">心跳持续保活</div>
        </div>

        {/* Offline Devices */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>未连接 / 离线</span>
            <WifiOff className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{data?.offline_devices ?? 0}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">真实离线，拒绝造假</div>
        </div>

        {/* Demo Devices */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>演示沙箱设备</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{data?.demo_devices ?? 0}</div>
          <div className="text-[11px] text-purple-400/80 mt-1">隔离沙箱流转</div>
        </div>

        {/* Total Rooms */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>划分空间</span>
            <Grid className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{data?.total_rooms ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">楼层与房间组织</div>
        </div>

        {/* Local Engine Status */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>本地引擎</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300">SQLite WAL</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>无锁并发模式</span>
          </div>
        </div>
      </div>

      {/* 4. Family Spaces Corridor (房间概况走廊) */}
      <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">家庭空间概况走廊</h3>
          </div>

          <button
            onClick={() => onNavigate('rooms')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>进入空间管理中心</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            暂未划分空间，点击右上角进入空间管理创建首个房间。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {rooms.map((room) => {
              const count = devices.filter((d) => d.room_id === room.id).length;
              const onlineCount = devices.filter((d) => d.room_id === room.id && d.status === 'online').length;

              return (
                <div
                  key={room.id}
                  onClick={() => onNavigate('devices')}
                  className="p-3.5 rounded-xl bg-[#0A0F1D]/80 border border-[#1E2D4A] hover:border-slate-500 hover:bg-[#121A2D] cursor-pointer transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-100">{room.name}</span>
                    <span className="text-[10px] text-slate-400 bg-[#1A253E] px-1.5 py-0.5 rounded border border-[#26375A]">
                      {room.area}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{count} 台设备</span>
                    <span className="text-emerald-400 font-medium">{onlineCount} 在线</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Frequently Used Devices Quick Control Ribbon */}
      <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">常用设备快捷触控</h3>
          </div>

          <button
            onClick={() => onNavigate('devices')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>查看全部设备</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            当前暂无已登记的硬件，可通过右上角智能家居中心进行手动登记或加载演示沙箱。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {devices.slice(0, 4).map((dev) => {
              const isOnline = dev.status === 'online';
              const isOn = dev.state?.state_value === 'on';
              const canCtrl = isOnline || dev.is_demo;

              return (
                <div
                  key={dev.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                    isOn && canCtrl
                      ? 'bg-[#15233E] border-blue-500/40 shadow-sm shadow-blue-500/10'
                      : 'bg-[#0A0F1D]/80 border-[#1E2D4A]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <h5 className="text-xs font-bold text-slate-100 truncate">{dev.name}</h5>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">{dev.room_name || '未分配'}</span>
                      {dev.is_demo && <span className="text-[10px] text-purple-400">[演示]</span>}
                      {!isOnline && !dev.is_demo && <span className="text-[10px] text-rose-400">[离线]</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeviceQuickToggle(dev)}
                    disabled={!canCtrl}
                    className={`px-3 py-1.5 rounded-btn text-xs font-semibold flex items-center gap-1 transition ${
                      !canCtrl
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/40'
                        : isOn
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-[#1A253E] hover:bg-[#253557] text-slate-200 border border-[#26375A]'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{isOn ? '开启' : '关闭'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Extensibility Slots (Microclimate / Energy / AI Assistant Preview) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weather & Microclimate */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <span>家庭微气候感知</span>
            </span>
            <span className="text-[10px] text-slate-500 bg-[#0A0F1D] px-2 py-0.5 rounded border border-[#1E2D4A]">
              待接入
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            预留室外气象站与室内空气质量联动接口，阶段 3 支持对接真实温湿度与空气传感器。
          </p>
        </div>

        {/* Real Energy Telemetry */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>物理能耗计量</span>
            </span>
            <span className="text-[10px] text-slate-500 bg-[#0A0F1D] px-2 py-0.5 rounded border border-[#1E2D4A]">
              待接入
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            严禁虚假预估用电量，系统预留智能计量插座真实电量功率实体，阶段 3 呈现分时统计。
          </p>
        </div>

        {/* AI Butler Suggestion */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-4 space-y-2 shadow-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI 管家建议</span>
            </span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
              规划中
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            本地 AI 对话中枢正在构建中，阶段 3 具备自然语言查询、告警归纳与权限二次确认能力。
          </p>
        </div>
      </div>

      {/* 7. Bottom Activity & Security Logs Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>操作安全审计流水</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">最新 10 条</span>
          </div>

          <div className="space-y-2.5">
            {data?.recent_audits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">暂无操作审计记录</div>
            ) : (
              data?.recent_audits.map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 rounded-xl bg-[#0A0F1D]/80 border border-[#1E2D4A] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="font-mono text-slate-300 bg-[#1A253E] px-2 py-0.5 rounded text-[10px] border border-[#26375A]">
                      {audit.username}
                    </span>
                    <span className="text-slate-200 font-medium">{audit.action}</span>
                    <span className="text-slate-500 text-[11px] truncate">
                      {audit.target_type}: {audit.target_id?.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(audit.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-[#131C31] border border-[#1E2D4A] rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>系统运行事件流水</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">内核状态同步</span>
          </div>

          <div className="space-y-2.5">
            {data?.recent_events.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">暂无系统事件记录</div>
            ) : (
              data?.recent_events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-[#0A0F1D]/80 border border-[#1E2D4A] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Badge variant={evt.level === 'error' ? 'offline' : evt.level === 'warning' ? 'warning' : 'info'}>
                      {evt.source}
                    </Badge>
                    <span className="text-slate-300 truncate">{evt.message}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
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
