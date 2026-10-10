import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Device, Room } from '../types';
import { Loading } from '../components/common/Loading';
import { CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { DeviceCard } from '../components/devices/DeviceCard';
import { DeviceListView } from '../components/devices/DeviceListView';
import { DeviceDetailDrawer } from '../components/devices/DeviceDetailDrawer';
import { DeviceConnectWizard } from '../components/devices/DeviceConnectWizard';
import { useToast } from '../context/ToastContext';
import {
  Cpu,
  Search,
  Plus,
  RotateCw,
  LayoutGrid,
  List,
  Layers,
  Sparkles,
  Filter,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';

type ViewMode = 'grouped' | 'grid' | 'list';

export const Devices: React.FC = () => {
  const { success, error: toastError, warning } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [demoFilter, setDemoFilter] = useState<string>('all'); // all, demo, real
  const [selectedType, setSelectedType] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  // Modals & Drawers
  const [isConnectWizardOpen, setIsConnectWizardOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);

  const fetchRooms = async () => {
    try {
      const data = await api.rooms.list();
      setRooms(data);
    } catch {}
  };

  const fetchDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isDemoParam = demoFilter === 'demo' ? true : demoFilter === 'real' ? false : undefined;
      const data = await api.devices.list({
        room_id: selectedRoom || undefined,
        status: selectedStatus || undefined,
        device_type: selectedType || undefined,
        is_demo: isDemoParam,
        keyword: keyword || undefined,
      });
      setDevices(data);
    } catch (err: any) {
      setError(err.message || '获取设备列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [selectedRoom, selectedStatus, selectedType, demoFilter, keyword]);

  const handleControl = async (device: Device, command: string, params: Record<string, any> = {}) => {
    if (!device.is_demo && device.status !== 'online') {
      warning(`设备【${device.name}】处于未连接/离线状态，禁止伪造控制！`);
      return;
    }

    try {
      const updated = await api.devices.control(device.id, command, params);
      setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (detailDevice && detailDevice.id === updated.id) {
        setDetailDevice(updated);
      }
      success(`指令 [${command}] 执行完成 (已记录审计流水)`);
    } catch (err: any) {
      toastError(err.message || '执行控制指令失败');
      throw err;
    }
  };

  const handleManualRegister = async (data: any) => {
    await api.devices.create(data);
    success('新硬件登记成功！已诚实标记为未连接状态，等待物理通信建立');
    await fetchDevices();
  };

  const handleSeedDemo = async () => {
    const res = await api.devices.seedDemo();
    success(res.message || '演示沙箱环境已载入');
    await fetchRooms();
    await fetchDevices();
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!window.confirm(`确定要移除设备【${device.name}】吗？`)) return;
    try {
      await api.devices.delete(device.id);
      success(`设备【${device.name}】已成功移除`);
      if (detailDevice?.id === device.id) setDetailDevice(null);
      await fetchDevices();
    } catch (err: any) {
      toastError(err.message || '移除设备失败');
    }
  };

  // Group devices by room for 'grouped' view
  const groupedDevices = useMemo(() => {
    const groups: { roomId: string; roomName: string; area: string; devices: Device[] }[] = [];

    // Group assigned rooms
    rooms.forEach((r) => {
      const devsInRoom = devices.filter((d) => d.room_id === r.id);
      if (devsInRoom.length > 0 || selectedRoom === r.id) {
        groups.push({
          roomId: r.id,
          roomName: r.name,
          area: r.area,
          devices: devsInRoom,
        });
      }
    });

    // Unassigned room
    const unassigned = devices.filter((d) => !d.room_id);
    if (unassigned.length > 0 && (!selectedRoom || selectedRoom === 'unassigned')) {
      groups.push({
        roomId: 'unassigned',
        roomName: '未分配空间',
        area: '待划归',
        devices: unassigned,
      });
    }

    return groups;
  }, [rooms, devices, selectedRoom]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            <span>智能家居纳管与控制中心</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            支持空间分组、卡片控制与列表模式，严格秉持真实硬件离线透明与演示沙箱隔离
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-[#131C31] p-1 rounded-xl border border-[#1E2D4A] shadow-inner">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'grouped' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="按空间分组视图"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">空间分组</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="全局卡片网格"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">网格卡片</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="高密度表格列表"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">详细列表</span>
            </button>
          </div>

          {/* Connect Wizard button */}
          <button
            onClick={() => setIsConnectWizardOpen(true)}
            className="px-4 py-2 rounded-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>接入新设备</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={fetchDevices}
            className="p-2 rounded-btn bg-[#131C31] border border-[#1E2D4A] text-slate-400 hover:text-slate-200 hover:bg-[#1A253E] transition"
            title="刷新列表"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="p-4 rounded-card bg-[#131C31] border border-[#1E2D4A] shadow-card grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索设备名称、MAC或标识..."
            className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Room Filter */}
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">全部家庭空间</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.area})
            </option>
          ))}
          <option value="unassigned">未分配空间</option>
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">全部设备类型</option>
          <option value="light">照明灯具</option>
          <option value="switch">开关插座</option>
          <option value="climate">温控环境</option>
          <option value="sensor">环境传感</option>
          <option value="curtain">窗帘遮阳</option>
          <option value="media">影音娱乐</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">全部物理状态</option>
          <option value="online">仅看通信在线</option>
          <option value="offline">仅看未连接/离线</option>
        </select>

        {/* Demo Filter */}
        <select
          value={demoFilter}
          onChange={(e) => setDemoFilter(e.target.value)}
          className="bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">全量设备 (物理+沙箱)</option>
          <option value="demo">仅演示模拟沙箱</option>
          <option value="real">仅物理真实硬件</option>
        </select>
      </div>

      {/* 3. Main Views Content */}
      {isLoading ? (
        <CardSkeleton count={6} />
      ) : error ? (
        <div className="p-8 text-center bg-[#131C31] border border-rose-500/30 rounded-card shadow-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="未检索到匹配的智能硬件"
          description="当前未找到符合筛选条件的硬件。你可以手动登记物理设备，或者一键加载隔离演示沙箱体验调光与温控。"
          actionText="接入首个硬件"
          onAction={() => setIsConnectWizardOpen(true)}
          secondaryActionText="加载演示沙箱"
          onSecondaryAction={handleSeedDemo}
        />
      ) : viewMode === 'list' ? (
        /* High-density Table View */
        <DeviceListView
          devices={devices}
          onControl={handleControl}
          onOpenDetail={(d) => setDetailDevice(d)}
          onDelete={handleDeleteDevice}
        />
      ) : viewMode === 'grouped' ? (
        /* Room Grouped View */
        <div className="space-y-8">
          {groupedDevices.map((group) => (
            <div key={group.roomId} className="space-y-3.5">
              {/* Group header */}
              <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-base font-bold text-slate-100">{group.roomName}</h3>
                  <span className="text-[11px] text-slate-400 bg-[#131C31] px-2 py-0.5 rounded border border-[#1E2D4A]">
                    {group.area}
                  </span>
                  <span className="text-xs text-slate-500">({group.devices.length} 台)</span>
                </div>
              </div>

              {/* Devices grid within room */}
              {group.devices.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-[#0A0F1D]/50 rounded-xl border border-dashed border-[#1E2D4A]">
                  该空间暂无分配的硬件
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.devices.map((dev) => (
                    <DeviceCard
                      key={dev.id}
                      device={dev}
                      onControl={handleControl}
                      onOpenDetail={(d) => setDetailDevice(d)}
                      onDelete={handleDeleteDevice}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Global Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onControl={handleControl}
              onOpenDetail={(d) => setDetailDevice(d)}
              onDelete={handleDeleteDevice}
            />
          ))}
        </div>
      )}

      {/* 4. Detail Slide-over Drawer */}
      <DeviceDetailDrawer
        device={detailDevice}
        isOpen={!!detailDevice}
        onClose={() => setDetailDevice(null)}
        onControl={handleControl}
      />

      {/* 5. Device Connect Wizard Modal */}
      <DeviceConnectWizard
        isOpen={isConnectWizardOpen}
        onClose={() => setIsConnectWizardOpen(false)}
        rooms={rooms}
        onManualRegister={handleManualRegister}
        onSeedDemo={handleSeedDemo}
      />
    </div>
  );
};
