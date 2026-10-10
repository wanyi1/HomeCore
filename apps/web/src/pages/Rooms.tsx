import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Room, Device } from '../types';
import { Loading } from '../components/common/Loading';
import { CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { RoomSpaceCard } from '../components/rooms/RoomSpaceCard';
import { FloorplanView } from '../components/rooms/FloorplanView';
import { useToast } from '../context/ToastContext';
import {
  Grid,
  Plus,
  RotateCw,
  FolderPlus,
  AlertTriangle,
  LayoutGrid,
  Layers,
  MapPin,
} from 'lucide-react';

type RoomTab = 'spaces' | 'floorplan';

export const Rooms: React.FC = () => {
  const { success, error: toastError, warning } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: Space cards vs 2D Floorplan preview
  const [activeTab, setActiveTab] = useState<RoomTab>('spaces');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    area: '一楼',
    icon: 'sofa',
    sort_order: 0,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsData, devicesData] = await Promise.all([
        api.rooms.list(),
        api.devices.list(),
      ]);
      setRooms(roomsData);
      setDevices(devicesData);
    } catch (err: any) {
      setError(err.message || '获取空间列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      area: '一楼',
      icon: 'sofa',
      sort_order: (rooms.length + 1) * 10,
      description: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      area: room.area,
      icon: room.icon,
      sort_order: room.sort_order,
      description: room.description,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('请输入空间名称');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingRoom) {
        await api.rooms.update(editingRoom.id, formData);
        success(`空间【${formData.name}】已成功更新`);
      } else {
        await api.rooms.create(formData);
        success(`新空间【${formData.name}】已成功创建`);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || '保存空间失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (
      !window.confirm(
        `确定要移除空间【${room.name}】吗？\n原归属于该空间的设备将自动更新为【未分配】状态。`
      )
    ) {
      return;
    }
    try {
      await api.rooms.delete(room.id);
      success(`空间【${room.name}】已移除`);
      await fetchData();
    } catch (err: any) {
      toastError(err.message || '删除空间失败');
    }
  };

  const handleControlDeviceInRoom = async (device: Device, command: string) => {
    if (!device.is_demo && device.status !== 'online') {
      warning(`设备【${device.name}】未连接，禁止伪造控制！`);
      return;
    }
    try {
      await api.devices.control(device.id, command);
      success(`已切换【${device.name}】状态`);
      await fetchData();
    } catch (err: any) {
      toastError(err.message || '控制失败');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Grid className="w-6 h-6 text-blue-400" />
            <span>家庭空间组织中心 (Space Hub)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            按楼层、室内与户外划分逻辑空间，纳管实体归属并预留 2D 户型图交互
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#131C31] p-1 rounded-xl border border-[#1E2D4A] shadow-inner">
            <button
              onClick={() => setActiveTab('spaces')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'spaces'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>空间卡片 ({rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('floorplan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'floorplan'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>2D 户型图</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-btn bg-[#131C31] border border-[#1E2D4A] text-slate-400 hover:text-slate-200 hover:bg-[#1A253E] transition"
            title="刷新"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新建空间</span>
          </button>
        </div>
      </div>

      {/* 2. Content */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <div className="p-8 text-center bg-[#131C31] border border-rose-500/30 rounded-card shadow-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : activeTab === 'floorplan' ? (
        /* Floorplan Preview Component */
        <FloorplanView rooms={rooms} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="家庭空间尚未划分"
          description="开始创建客厅、主卧、书房、阳台等房间，构建你的家庭数字物理空间映射。"
          actionText="立即创建首个空间"
          onAction={handleOpenCreate}
        />
      ) : (
        /* Spaces Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <RoomSpaceCard
              key={room.id}
              room={room}
              devices={devices}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onControlDevice={handleControlDeviceInRoom}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Space Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `编辑空间: ${editingRoom.name}` : '新建家庭空间'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              空间名称 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 主卧、客厅、开放式厨房、阳光书房"
              className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">所属楼层 / 区域</label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="一楼">一楼 (Ground Floor)</option>
                <option value="二楼">二楼 (Second Floor)</option>
                <option value="三楼">三楼 (Third Floor)</option>
                <option value="地下室">地下室 (Basement)</option>
                <option value="庭院户外">庭院与阳台 (Outdoor)</option>
                <option value="室内">室内通用 (General)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">空间风格图标</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="sofa">沙发 (客厅 / 起居)</option>
                <option value="bed">床 (主卧 / 次卧)</option>
                <option value="utensils">餐具 (厨房 / 餐厅)</option>
                <option value="book-open">书本 (书房 / 办公)</option>
                <option value="home">房屋 (门厅 / 通用)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">空间备注与特性</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="例如: 主活动区域，包含吸顶灯与环境温控"
              className="w-full bg-[#0A0F1D] border border-[#1E2D4A] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-btn bg-[#0A0F1D] hover:bg-[#1A253E] text-slate-300 text-xs font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
            >
              {isSubmitting ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
